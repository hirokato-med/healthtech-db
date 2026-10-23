#!/usr/bin/env node
/**
 * 調査で集めた提携・出資・買収を data/partnerships.json（M&A・提携マップの元データ）に取り込む。
 *
 *   node scripts/merge-partnerships.mjs <file.json> [...]
 *
 * 同じ組み合わせ（from・to・type）は上書きし、出典は合わせる。空の項目は落とす。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const F = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'partnerships.json');
const list = JSON.parse(fs.readFileSync(F, 'utf8'));
const norm = (s = '') => s.normalize('NFKC').replace(/株式会社|合同会社|ホールディングス|\s/g, '').toLowerCase();
const key = (p) => `${norm(p.from)}|${norm(p.to)}|${p.type}`;
const byKey = new Map(list.map((p) => [key(p), p]));
const TYPES = ['partnership', 'investment', 'parent'];
const STATUS = ['継続', '終了', '不明'];
let added = 0, updated = 0;
const bad = [];
for (const f of process.argv.slice(2)) {
  const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const x of Array.isArray(raw) ? raw : raw.items) {
    if (!x.from || !x.to || !TYPES.includes(x.type) || !STATUS.includes(x.status)) { bad.push(`${x.from} → ${x.to}`); continue; }
    const rec = Object.fromEntries(Object.entries(x).filter(([, v]) => v !== '' && v != null && !(Array.isArray(v) && !v.length)));
    const prev = byKey.get(key(rec));
    if (prev) { Object.assign(prev, rec, { sources: [...new Set([...(prev.sources ?? []), ...(rec.sources ?? [])])] }); updated++; continue; }
    list.push(rec);
    byKey.set(key(rec), rec);
    added++;
  }
}
fs.writeFileSync(F, JSON.stringify(list, null, 1) + '\n');
console.error(`提携 追加 ${added} / 更新 ${updated} / 見送り ${bad.length} → 合計 ${list.length} 件`);
bad.forEach((b) => console.error('  - ' + b));
