#!/usr/bin/env node
/**
 * 提携・M&A の記録で、同じ出来事が2件に分かれているものを1件にまとめる（出典はまとめて残す）。
 * 同じ組み合わせ（向きは問わない）・同じ種類（type）・日付が3か月以内（年だけの日付はその年の中なら同じ）のもの。
 *   node scripts/dedupe-partnerships.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const F = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'data', 'partnerships.json');
const list = JSON.parse(fs.readFileSync(F, 'utf8'));
const dry = process.argv.includes('--dry');
const key = (s = '') => s.normalize('NFKC').replace(/株式会社|ホールディングス|,?\s?inc\.?|labs?|\s|[.,]/gi, '').toLowerCase();
const same = (a, b) => {
  if (!a.date || !b.date) return false;
  const ya = a.date.slice(0, 4), yb = b.date.slice(0, 4);
  if (a.date.length === 4 || b.date.length === 4) return ya === yb;
  const m = (d) => Number(d.slice(0, 4)) * 12 + Number(d.slice(5, 7));
  return Math.abs(m(a.date) - m(b.date)) <= 3;
};
const generic = (l = '') => /^(業務提携|資本業務提携|提携|出資)$/.test(l.trim()) || /で(業務|資本業務)提携$/.test(l);
const rank = (x) => (x.sources?.length ?? 0) * 10 + (x.date?.length ?? 0) + (generic(x.label) ? 0 : 5);

const gone = new Set();
let merged = 0;
for (let i = 0; i < list.length; i++) {
  if (gone.has(i)) continue;
  for (let j = i + 1; j < list.length; j++) {
    if (gone.has(j)) continue;
    const a = list[i], b = list[j];
    if (a.type !== b.type || !same(a, b)) continue;
    if ([key(a.from), key(a.to)].sort().join('|') !== [key(b.from), key(b.to)].sort().join('|')) continue;
    const [keep, drop] = rank(a) >= rank(b) ? [a, b] : [b, a];
    keep.sources = [...new Set([...(keep.sources ?? []), ...(drop.sources ?? [])])];
    if ((drop.date?.length ?? 0) > (keep.date?.length ?? 0)) keep.date = drop.date;
    // もう一方の呼び名が具体的なら、メモに残す（例：「CLINICSで資本業務提携」と「オンライン診療CLINICSの共同運営」）
    if (generic(keep.label) && drop.label && !generic(drop.label)) [keep.label, drop.label] = [drop.label, keep.label];
    if (drop.label && drop.label !== keep.label && !/^(業務提携|提携)$/.test(drop.label) && !(keep.note ?? '').includes(drop.label)) keep.note = [keep.note?.replace(/。+$/, ''), drop.label].filter(Boolean).join('。');
    if (!keep.kind && drop.kind) keep.kind = drop.kind;
    console.error(`まとめた：${keep.date} ${keep.from} → ${keep.to}「${keep.label}」 ← 「${drop.label}」`);
    if (keep === a) gone.add(j); else { list[i] = keep; gone.add(j); }
    merged++;
  }
}
const out = list.filter((_, i) => !gone.has(i));
if (!dry) fs.writeFileSync(F, JSON.stringify(out, null, 2) + '\n');
console.error(`${merged} 件をまとめた（${list.length} → ${out.length}）`);
