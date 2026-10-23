#!/usr/bin/env node
/**
 * 同じ事業の重複レコードを1件にまとめる（別々の調査で同じ事業が別名で入ったとき）。
 *
 *   node scripts/fold-services.mjs <残すID> <消すID> [<消すID>...]
 *
 * テーマ・出典・経過・止まった理由は合わせ、残す側が空の項目は消す側の値で埋める。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const F = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'services.json');
let s = JSON.parse(fs.readFileSync(F, 'utf8'));
const [keepId, ...dropIds] = process.argv.slice(2);
const keep = s.find((x) => x.id === keepId);
if (!keep || !dropIds.length) throw new Error('usage: fold-services.mjs <keep> <drop...>');
for (const id of dropIds) {
  const d = s.find((x) => x.id === id);
  if (!d) throw new Error(`not found: ${id}`);
  for (const k of ['themes', 'sources', 'endReasons', 'lessons']) if (d[k]) keep[k] = [...new Set([...(keep[k] ?? []), ...d[k]])];
  if (d.milestones) {
    const seen = new Set((keep.milestones ?? []).map((m) => m.date + m.text));
    keep.milestones = [...(keep.milestones ?? []), ...d.milestones.filter((m) => !seen.has(m.date + m.text))].sort((a, b) => a.date.localeCompare(b.date));
  }
  for (const [k, v] of Object.entries(d)) if (keep[k] == null || keep[k] === '') keep[k] = v;
  s = s.filter((x) => x.id !== id);
}
if (keep.endReasons?.length > 1) keep.endReasons = keep.endReasons.filter((r) => r !== 'unknown');
fs.writeFileSync(F, JSON.stringify(s, null, 2) + '\n');
console.error(`${keepId} に ${dropIds.join(', ')} をまとめました（${s.length} 件）`);
