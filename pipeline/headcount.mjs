#!/usr/bin/env node
/**
 * Healthtech DB の企業について、厚生年金保険の被保険者数（≒社員数）を日本年金機構の
 * 「厚生年金保険・健康保険 適用事業所検索システム」で引いて記録する。
 *
 *   node pipeline/headcount.mjs                       # data/companies.json の全社（毎月 GitHub Actions で実行）
 *   node pipeline/headcount.mjs path/to/companies.json
 *   node pipeline/headcount.mjs --only 9011001122229,4013201016660
 *
 * - 検索は法人番号で行う（法人番号の無い会社は対象外）。
 * - 検索システムのデータは月1回更新される（画面の「データ更新日」）。その年月を記録の月にする。
 * - 1社ごとに数秒あけて、穏当な頻度で引く。
 * - 出力:
 *     data/headcount/YYYY-MM.json   その月の全社分（事業所ごとの行と合計）
 *     data/headcount/history.csv    月 × 会社の被保険者数（推移を見る・配るための表）
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data', 'headcount');
const COMPANIES = path.join(ROOT, 'data', 'companies.json');
const SEARCH = 'https://www.nenkin.go.jp/do/search_section';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const JAR = path.join(os.tmpdir(), `nenkin-${process.pid}.jar`);
const WAIT_MS = 2500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const args = process.argv.slice(2);
const only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',')) : null;
const file = args.find((a) => a.endsWith('.json'));

const curl = async (extra) =>
  (await run('curl', ['-sSL', '--max-time', '40', '-A', UA, '-H', 'Accept-Language: ja', '-b', JAR, '-c', JAR, ...extra], { maxBuffer: 50 << 20 })).stdout;

const text = (s) => s.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/[\s　]+/g, ' ').trim();
// 「平成30年05月14日」→「2018-05-14」
const ERA = { 明治: 1867, 大正: 1911, 昭和: 1925, 平成: 1988, 令和: 2018 };
const toIso = (s) => {
  const m = s.match(/(明治|大正|昭和|平成|令和)(元|\d+)年(\d+)月(\d+)日/);
  if (!m) return s;
  const y = ERA[m[1]] + (m[2] === '元' ? 1 : Number(m[2]));
  return `${y}-${m[3].padStart(2, '0')}-${m[4].padStart(2, '0')}`;
};

async function search(corp) {
  const top = await curl([`${SEARCH}/`]);
  const token = top.match(/name="hdnTransactionToken" value="([^"]+)"/)?.[1];
  if (!token) throw new Error('検索画面のトークンが取れない');
  const body = new URLSearchParams({
    hdnPrefectureCode: '', hdnSearchOffice: '3', hdnSearchCriteria: '3', txtOfficeName: '', txtOfficeAddress: '', txtHoujinNo: corp,
    hdnDisplayItemsRestorationScreenDto: '', hdnDisplayItemsRestorationScreenDtoKeepParam: 'false', hdnTransactionToken: token,
    hdnTokenKeepParam: 'true', gmnId: 'GB10001SC010', hdnErrorFlg: '', eventId: '/SEARCH.HTML', '/search.html': '',
  }).toString();
  const html = await curl(['-X', 'POST', '--data', body, SEARCH]);
  const updated = html.match(/データ更新日：(\d{4})年(\d{2})月(\d{2})日/);
  const offices = [...html.matchAll(/<tr>\s*(<td class="search_top">[\s\S]*?)<\/tr>/g)].map((m) => {
    const td = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => text(x[1]));
    return { name: td[0], address: td[1], corporateNumber: td[2], expanded: td[3] === '該当', status: td[4], office: td[5], appliedAt: toIso(td[6] ?? ''), insured: Number((td[7] ?? '').replace(/[^\d]/g, '')) || 0 };
  });
  return { updatedAt: updated ? `${updated[1]}-${updated[2]}-${updated[3]}` : '', offices };
}

const companies = JSON.parse(fs.readFileSync(file ?? COMPANIES, 'utf8')).filter((c) => !['閉鎖', '合併', '対象外'].includes(c.exit));
const targets = companies.filter((c) => /^\d{13}$/.test(c.corporateNumber) && (!only || only.has(c.corporateNumber)));
console.error(`対象 ${targets.length} 社（法人番号あり）`);

const rows = [];
let updatedAt = '';
for (const [i, c] of targets.entries()) {
  try {
    const r = await search(c.corporateNumber);
    updatedAt ||= r.updatedAt;
    const live = r.offices.filter((o) => o.status.startsWith('現存'));
    rows.push({ id: c.id, name: c.name, corporateNumber: c.corporateNumber, insured: live.reduce((s, o) => s + o.insured, 0), found: r.offices.length > 0, closed: r.offices.length > 0 && live.length === 0, offices: r.offices });
    if ((i + 1) % 25 === 0) console.error(`  ${i + 1}/${targets.length}`);
  } catch (e) {
    rows.push({ id: c.id, name: c.name, corporateNumber: c.corporateNumber, error: e.message });
  }
  await sleep(WAIT_MS);
}

const month = (updatedAt || new Date().toISOString()).slice(0, 7);
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, `${month}.json`), JSON.stringify({ month, sourceUpdatedAt: updatedAt, collectedAt: new Date().toISOString(), source: '日本年金機構 厚生年金保険・健康保険 適用事業所検索システム', companies: rows }, null, 1) + '\n');

// history.csv: 同じ月の行は今回の結果で置き換える
const csv = path.join(OUT, 'history.csv');
const head = 'month,id,corporate_number,name,insured,found,closed';
const prev = fs.existsSync(csv) ? fs.readFileSync(csv, 'utf8').trim().split('\n').slice(1).filter((l) => !l.startsWith(month + ',')) : [];
const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
const now = rows.filter((r) => !r.error).map((r) => [month, r.id, r.corporateNumber, q(r.name), r.insured, r.found, r.closed].join(','));
fs.writeFileSync(csv, [head, ...[...prev, ...now].sort()].join('\n') + '\n');

const ok = rows.filter((r) => !r.error);
console.error(`${month}（データ更新日 ${updatedAt}）: 取得 ${ok.length} 社 / 該当なし ${ok.filter((r) => !r.found).length} / 全喪 ${ok.filter((r) => r.closed).length} / エラー ${rows.length - ok.length}`);
console.error(`被保険者数の合計 ${ok.reduce((s, r) => s + r.insured, 0).toLocaleString()} 人`);
