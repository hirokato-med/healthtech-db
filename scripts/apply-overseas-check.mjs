#!/usr/bin/env node
/**
 * 海外企業を一次情報で確かめた結果（out-N.json）を data/overseas.json に当てる。
 *   node scripts/apply-overseas-check.mjs out-1.json out-2.json ...
 * - 確かめた会社は checkedAt を入れ、名前・国・創業年・創業者・上場/買収/閉鎖・いまの事業・説明・出来事・出典を入れ替える。
 * - 特定できない会社（unidentified）、ヘルスケアの外（notHealthcare）、重複（duplicateOf）は hidden にして一覧と検索に出さない。
 * - 買収の合意だけで完了を確かめられないものは「未上場」にする。
 * - 昔のメモ（note）と昔の上場状況（exit）は残すが、サイトには出さない。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const F = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'data', 'overseas.json');
const list = JSON.parse(fs.readFileSync(F, 'utf8'));
const byId = new Map(list.map((o) => [o.id, o]));
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const ymOk = (v) => (typeof v === 'string' && /^\d{4}(-\d{2})?$/.test(v.trim()) ? v.trim() : undefined);
const EU = /Germany|Switzerland|United Kingdom|Finland|France|Sweden|Denmark|Netherlands|Spain|Italy|Ireland|Norway|Belgium|Austria|Portugal|Poland|Estonia/;
const ASIA = /India|China|Singapore|Indonesia|Philippines|Japan|Korea|Taiwan|Hong Kong|Vietnam|Thailand|Malaysia|Israel/;
const regionOf = (c, old) => (EU.test(c) ? 'EU' : ASIA.test(c) ? 'ASIA' : /United States|Canada/.test(c) ? 'US' : old);
const LISTING = new Set(['未上場', '上場', '上場廃止', '買収', '閉鎖']);
const ACT = new Set(['事業継続', '事業終了', '不明']);

let checked = 0, hidden = 0;
for (const f of process.argv.slice(2)) for (const x of JSON.parse(fs.readFileSync(f, 'utf8'))) {
  const o = byId.get(x.id);
  if (!o) continue;
  if (x.unidentified || x.notHealthcare || x.duplicateOf) {
    o.hidden = x.unidentified ? '特定できない' : x.duplicateOf ? `重複（${x.duplicateOf}）` : 'ヘルスケアの外';
    hidden++;
    continue;
  }
  delete o.hidden;
  if (str(x.name)) o.name = x.name.trim();
  if (str(x.hp) !== undefined || x.hp === '') o.hp = str(x.hp) ?? '';
  if (str(x.country)) { o.country = x.country.trim(); o.region = regionOf(o.country, o.region); }
  if (Number.isInteger(x.foundedYear)) o.foundedYear = x.foundedYear;
  // 確度の低い会社は創業者を出さない（企業データベースだけが出どころのもの）
  o.founders = x.confidence === 'low' ? [] : (x.founders ?? []).filter(str).map((s) => s.trim());
  let listing = LISTING.has(x.listing) ? x.listing : '未上場';
  if (listing === '買収' && !ymOk(x.acquiredAt) && /完了(の発表|は)?(を)?確認でき|完了予定/.test(x.note ?? '')) listing = '未上場';
  o.listing = listing;
  for (const k of ['listedAt', 'acquiredAt', 'closedAt', 'delistedAt']) { const v = ymOk(x[k]); if (v) o[k] = v; else delete o[k]; }
  for (const k of ['market', 'ticker', 'acquiredBy']) { const v = str(x[k]); if (v) o[k] = v; else delete o[k]; }
  if (listing !== '買収') { delete o.acquiredBy; delete o.acquiredAt; }
  o.activity = ACT.has(x.activity) ? x.activity : '不明';
  if (str(x.description)) o.description = x.description.trim();
  o.events = (x.events ?? []).filter((e) => ymOk(e.date) && str(e.text)).map((e) => ({ date: e.date.trim(), text: e.text.trim() }));
  o.sources = (x.sources ?? []).filter(str);
  o.confidence = ['high', 'medium', 'low'].includes(x.confidence) ? x.confidence : 'medium';
  o.checkedAt = '2026-11';
  checked++;
}
fs.writeFileSync(F, JSON.stringify(list, null, 2) + '\n');
console.error(`確かめた ${checked} 社／一覧に出さない ${hidden} 社（全 ${list.length} 社）`);
