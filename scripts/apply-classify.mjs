#!/usr/bin/env node
/**
 * 事業データベースの各事業に「事業の種類」を当てる（カテゴリ → 事業の種類 → 各社のサービス）。
 *
 *   node scripts/apply-classify.mjs classify-out-1.json classify-out-2.json ...
 *
 * 入力（JSON 配列）: { id, category, type, rename, out, suggest, note }
 * - type は data/taxonomy.json の slug。category はその種類のカテゴリに合わせる。
 * - rename があれば名前を差し替える（元の名前は formerName に残す）。
 * - out（ヘルスケアの事業ではない）は事業データベースから外す。
 * - type が無く suggest があるものは一覧で知らせる（種類を足すかどうかは編集部が決める）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = path.join(ROOT, 'data', 'services.json');
const services = JSON.parse(fs.readFileSync(F, 'utf8'));
const tax = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'taxonomy.json'), 'utf8'));
const catOf = new Map(tax.flatMap((c) => c.types.map((t) => [t.slug, c.category])));
const byId = new Map(services.map((s) => [s.id, s]));
let typed = 0, moved = 0, renamed = 0;
const out = new Set(), suggest = [];
for (const f of process.argv.slice(2)) {
  for (const x of JSON.parse(fs.readFileSync(f, 'utf8'))) {
    const s = byId.get(x.id);
    if (!s) continue;
    if (x.out) { out.add(s.id); continue; }
    if (x.type && catOf.has(x.type)) {
      const cat = catOf.get(x.type);
      if (s.category !== cat) { s.category = cat; moved++; }
      s.type = x.type;
      typed++;
    } else if (x.suggest) suggest.push(`${s.name}（${s.company}）→ ${x.suggest}`);
    if (x.rename && x.rename.trim() && x.rename.trim() !== s.name) { s.formerName ??= s.name; s.name = x.rename.trim(); renamed++; }
  }
}
const kept = services.filter((s) => !out.has(s.id));
fs.writeFileSync(F, JSON.stringify(kept, null, 2) + '\n');
console.error(`種類を当てた ${typed} 件（カテゴリを付け替え ${moved} 件）/ 名前を差し替え ${renamed} 件 / ヘルスケア外で外した ${out.size} 件 / 種類なし ${suggest.length} 件`);
if (suggest.length) console.error('新しい種類の案:\n  ' + suggest.join('\n  '));
