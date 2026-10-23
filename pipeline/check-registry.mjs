#!/usr/bin/env node
/**
 * 企業DBの法人番号ごとに、国税庁 法人番号公表サイトの「変更履歴」を取り、data/registry.json に貯める。
 * 閉鎖（合併による解散・清算結了）・商号変更・本店移転を見つけて、企業リストの整備に使う。
 *
 *   node pipeline/check-registry.mjs            # 全社を取り直す（1社 1.5 秒あける）
 *   node pipeline/check-registry.mjs --only 4010001075490,7010401191983  # 指定した番号だけ
 *   node pipeline/check-registry.mjs --report   # 取った結果から、DB と食い違う会社を一覧にする
 *
 * 出典: 国税庁法人番号公表サイト（国税庁）（https://www.houjin-bangou.nta.go.jp/）を加工して作成
 * 利用条件: 公共データ利用規約（第1.0版）。出典と加工した旨を表示する。
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (f) => path.join(ROOT, 'data', f);
const OUT = P('registry.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const PAGE = (n) => `https://www.houjin-bangou.nta.go.jp/henkorireki-johoto.html?selHouzinNo=${n}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ERA = { 明治: 1867, 大正: 1911, 昭和: 1925, 平成: 1988, 令和: 2018 };
const toIso = (s) => {
  const m = s.normalize('NFKC').match(/(明治|大正|昭和|平成|令和)(元|\d+)年(\d+)月(\d+)日/);
  if (!m) return '';
  return `${ERA[m[1]] + (m[2] === '元' ? 1 : Number(m[2]))}-${m[3].padStart(2, '0')}-${m[4].padStart(2, '0')}`;
};
const plain = (html) =>
  html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/\s+/g, ' ');

async function fetchRecord(num) {
  const { stdout } = await run('curl', ['-sSL', '--max-time', '40', '-A', UA, PAGE(num)], { maxBuffer: 20 << 20 });
  const t = plain(stdout);
  const name = t.match(/商号又は名称 (.+?) 商号又は名称（フリガナ）/)?.[1]?.trim() ?? '';
  const addrAndStatus = t.match(/本店又は主たる事務所の所在地 (.+?) 最終更新年月日/)?.[1]?.trim() ?? '';
  const [address, status = ''] = addrAndStatus.split(/ 状態 /);
  // 閉鎖の状態欄に「…○○株式会社（1234567890123）に合併し解散」とあれば、合併先の法人番号を取る
  const mergedInto = status.match(/([^\s]+?)（(\d{13})）に合併し解散/);
  const updated = toIso(t.match(/最終更新年月日 (\S+)/)?.[1] ?? '');
  const block = t.slice(t.indexOf('公表以後の変更履歴'), t.indexOf('ホームに戻る', t.indexOf('公表以後の変更履歴')));
  const events = [...block.matchAll(/No\.\d+ (?:事由発生年月日 (\S+) 変更の事由 )?(.+?)(?= No\.\d+ |$)/g)].map((m) => {
    const body = m[2].trim();
    if (body.startsWith('新規')) return { date: toIso(body), kind: '新規', detail: '' };
    const kind = body.match(/^(商号又は名称の変更|本店又は主たる事務所の所在地の変更|吸収合併|登記記録の閉鎖等（[^）]*）|登記記録の閉鎖等|登記記録の復活等|国内における主たる事務所の所在地の変更|\S+)/)?.[1] ?? '';
    return { date: toIso(m[1] ?? ''), kind, detail: body.slice(kind.length).replace(/^\s*旧情報\s*/, '旧: ').trim() };
  });
  const closed = events.find((e) => e.kind.startsWith('登記記録の閉鎖'));
  const reopened = events.find((e) => e.kind.startsWith('登記記録の復活'));
  return { corporateNumber: num, name, address: address.trim(), status: status.trim(), ...(mergedInto ? { mergedInto: { name: mergedInto[1].replace(/^.*?[０-９0-9]+階/, ''), corporateNumber: mergedInto[2] } } : {}), updated, closed: closed && !(reopened && reopened.date > closed.date) ? closed : null, events, checkedAt: new Date().toISOString().slice(0, 10) };
}

const companies = JSON.parse(fs.readFileSync(P('companies.json'), 'utf8'));

if (!process.argv.includes('--report')) {
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null;
  const nums = only ?? [...new Set(companies.flatMap((c) => [c.corporateNumber, ...(c.formerCorporateNumbers ?? []).map((f) => f.number)]).filter((n) => /^\d{13}$/.test(n)))];
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  const out = { source: '国税庁法人番号公表サイト（国税庁）（https://www.houjin-bangou.nta.go.jp/）を加工して作成', records: { ...(prev.records ?? {}) } };
  console.error(`法人番号 ${nums.length} 件の変更履歴を取得`);
  for (const [i, n] of nums.entries()) {
    try { out.records[n] = await fetchRecord(n); } catch (e) { console.error(`  ${n}: ${e.message}`); }
    if ((i + 1) % 50 === 0) console.error(`  ${i + 1}/${nums.length}`);
    await sleep(1500);
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
}

// ---- DB と食い違う会社の一覧 ----
const reg = JSON.parse(fs.readFileSync(OUT, 'utf8')).records;
const norm = (s) => s.normalize('NFKC').replace(/株式会社|有限会社|合同会社|一般社団法人|\s/g, '').toLowerCase();
const rows = { closed: [], renamed: [], empty: [] };
for (const c of companies) {
  const r = reg[c.corporateNumber];
  if (!r) continue;
  if (!r.name) { rows.empty.push(`${c.name}（${c.corporateNumber}）`); continue; }
  if (r.closed && c.exit !== '閉鎖') rows.closed.push(`${c.name}（${c.corporateNumber}）: ${r.closed.date} ${r.closed.kind}${r.mergedInto ? `→ 合併先 ${r.mergedInto.name}（${r.mergedInto.corporateNumber}）` : ''}／DB: ${c.exit}`);
  if (norm(r.name) !== norm(c.name)) rows.renamed.push(`${c.name} → 登記上「${r.name}」（${c.corporateNumber}）`);
}
console.error(`\n閉鎖されているが DB では閉鎖になっていない: ${rows.closed.length} 社`);
rows.closed.forEach((s) => console.error('  - ' + s));
console.error(`\n登記上の商号が DB の社名と違う: ${rows.renamed.length} 社`);
rows.renamed.forEach((s) => console.error('  - ' + s));
if (rows.empty.length) console.error(`\n取得できなかった: ${rows.empty.join('、')}`);
