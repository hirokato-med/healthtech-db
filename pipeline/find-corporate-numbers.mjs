#!/usr/bin/env node
/**
 * 法人番号が空の企業について、日本年金機構「厚生年金保険・健康保険 適用事業所検索システム」を
 * 社名で検索し、法人番号の候補を探す。
 *
 *   node pipeline/find-corporate-numbers.mjs            # 候補を data/corporate-number-candidates.json に書く
 *   node pipeline/find-corporate-numbers.mjs --limit 5  # 試しに5社だけ
 *   node pipeline/find-corporate-numbers.mjs --apply    # 「一致」の候補を companies.json に入れる
 *
 * - 社名（株式会社などを除いて全角にしたもの）と都道府県で検索する。
 * - 社名が一致し、かつ所在地（市区町村＋町名）も一致する事業所が1つだけのときを「一致」とする。
 *   社名だけ一致・複数ヒットは「要確認」として残し、自動では入れない。
 * - id は変えない（URL を保つため）。corporateNumber と corporateNumberUrl だけ埋める。
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (f) => path.join(ROOT, 'data', f);
const OUT = P('corporate-number-candidates.json');
const SEARCH = 'https://www.nenkin.go.jp/do/search_section';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const JAR = path.join(os.tmpdir(), `nenkin-name-${process.pid}.jar`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const curl = async (extra) =>
  (await run('curl', ['-sSL', '--max-time', '40', '-A', UA, '-H', 'Accept-Language: ja', '-b', JAR, '-c', JAR, ...extra], { maxBuffer: 50 << 20 })).stdout;
const text = (s) => s.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/[\s　]+/g, ' ').trim();

const LEGAL = /株式会社|有限会社|合同会社|一般社団法人|一般財団法人|医療法人社団|医療法人|\(株\)|（株）/g;
const norm = (s) => s.normalize('NFKC').replace(LEGAL, '').replace(/[（(][^）)]*[）)]/g, '').replace(/[\s・'’.,&＆-]/g, '').toLowerCase();
// 検索窓は全角のみ受け付ける
const toZenkaku = (s) => s.replace(/[!-~]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0xfee0)).replace(/ /g, '　');
// 「東京都港区虎ノ門3-8-21」→「港区虎ノ門」
const area = (addr) => {
  const a = addr.normalize('NFKC').replace(/^(東京都|北海道|(京都|大阪)府|.{2,3}県)/, '').replace(/\s/g, '');
  return a.match(/^(.+?[市区町村])(.+?郡.+?[町村])?([^\d０-９\-−‐ー丁]+)?/)?.slice(1).filter(Boolean).join('').replace(/[一二三四五六七八九十]+丁目.*/, '') ?? '';
};

async function searchByName(name, prefCode) {
  const top = await curl([`${SEARCH}/`]);
  const token = top.match(/name="hdnTransactionToken" value="([^"]+)"/)?.[1];
  const body = new URLSearchParams({
    hdnPrefectureCode: prefCode, hdnSearchOffice: '1', hdnSearchCriteria: '1', txtOfficeName: name, txtOfficeAddress: '', txtHoujinNo: '',
    hdnDisplayItemsRestorationScreenDto: '', hdnDisplayItemsRestorationScreenDtoKeepParam: 'false', hdnTransactionToken: token ?? '',
    hdnTokenKeepParam: 'true', gmnId: 'GB10001SC010', hdnErrorFlg: '', eventId: '/SEARCH.HTML', '/search.html': '',
  }).toString();
  const html = await curl(['-X', 'POST', '--data', body, SEARCH]);
  return [...html.matchAll(/<tr>\s*(<td class="search_top">[\s\S]*?)<\/tr>/g)].map((m) => {
    const td = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => text(x[1]));
    return { name: td[0], address: td[1], corporateNumber: td[2] };
  });
}

const companies = JSON.parse(fs.readFileSync(P('companies.json'), 'utf8'));

if (process.argv.includes('--apply')) {
  const cand = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const used = new Set(companies.map((c) => c.corporateNumber).filter(Boolean));
  let n = 0;
  for (const r of cand.filter((x) => x.result === '一致')) {
    const c = companies.find((x) => x.id === r.id);
    if (!c || c.corporateNumber || used.has(r.corporateNumber)) continue;
    c.corporateNumber = r.corporateNumber;
    c.corporateNumberUrl = `https://www.houjin-bangou.nta.go.jp/henkorireki-johoto.html?selHouzinNo=${r.corporateNumber}`;
    used.add(r.corporateNumber);
    n++;
  }
  fs.writeFileSync(P('companies.json'), JSON.stringify(companies, null, 2) + '\n');
  console.error(`法人番号を ${n} 社に入れた`);
  process.exit(0);
}

// 都道府県コード（検索画面の選択肢から取る。JIS コードとは違う）
const top = await curl([`${SEARCH}/`]);
const PREF = Object.fromEntries([...top.matchAll(/<option class="col_2_1" value="(\d+)">([^<]+)<\/option>/g)].map((m) => [m[2], m[1]]));

const limit = process.argv.includes('--limit') ? Number(process.argv[process.argv.indexOf('--limit') + 1]) : Infinity;
const targets = companies.filter((c) => c.exit !== '閉鎖' && !/^\d{13}$/.test(c.corporateNumber)).slice(0, limit);
console.error(`法人番号が空の会社 ${targets.length} 社を検索`);
const out = [];
for (const [i, c] of targets.entries()) {
  const key = c.name.replace(LEGAL, '').replace(/[（(][^）)]*[）)]/g, '').trim();
  const pref = c.prefecture || c.address.match(/^(東京都|北海道|(京都|大阪)府|.{2,3}県)/)?.[1] || '';
  let rows = [];
  try { rows = await searchByName(toZenkaku(key), PREF[pref] ?? ''); } catch (e) { out.push({ id: c.id, name: c.name, result: 'エラー', error: e.message }); continue; }
  const same = rows.filter((r) => norm(r.name) === norm(c.name));
  const myArea = area(c.address);
  const near = myArea ? same.filter((r) => { const a = area(r.address); return a && (a.startsWith(myArea) || myArea.startsWith(a)); }) : [];
  const nums = [...new Set(same.map((r) => r.corporateNumber).filter((x) => /^\d{13}$/.test(x)))];
  let result = 'なし';
  let pick = null;
  if (near.length && new Set(near.map((r) => r.corporateNumber)).size === 1) { result = '一致'; pick = near[0]; }
  else if (nums.length === 1) { result = '社名のみ一致'; pick = same[0]; }
  else if (nums.length > 1) result = '複数';
  out.push({ id: c.id, name: c.name, address: c.address, result, ...(pick ? { corporateNumber: pick.corporateNumber, foundName: pick.name, foundAddress: pick.address } : {}), hits: rows.length });
  if ((i + 1) % 20 === 0) console.error(`  ${i + 1}/${targets.length}`);
  await sleep(2500);
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
const count = (k) => out.filter((x) => x.result === k).length;
console.error(`一致 ${count('一致')} / 社名のみ一致 ${count('社名のみ一致')} / 複数 ${count('複数')} / なし ${count('なし')} / エラー ${count('エラー')}`);
