#!/usr/bin/env node
/**
 * 会社の主なカテゴリ（categories[0]）を、その会社の事業データにそろえる。
 * 主なカテゴリに当たる事業が1件も無い会社だけ、事業の数がいちばん多いカテゴリを先頭に出す。
 * 元のカテゴリは事業があるものだけ残し、事業の多いカテゴリで埋める（最大3つ）。
 * 同数のときは、医療機器の承認がある事業のカテゴリ → 会社に元からあるカテゴリ → デジタルヘルスの中心（周辺でない）の順。
 *   node scripts/fix-primary-category.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (f) => path.join(ROOT, 'data', f);
const read = (f) => JSON.parse(fs.readFileSync(P(f), 'utf8'));
const companies = read('companies.json');
const services = read('services.json');
const catName = Object.fromEntries(read('categories.json').map((c) => [c.slug, c.name]));
const adjacent = new Set(read('taxonomy.json').flatMap((c) => c.types.filter((t) => t.scope === 'adjacent').map((t) => t.slug)));
const dry = process.argv.includes('--dry');

let changed = 0;
for (const c of companies) {
  const sv = services.filter((s) => s.companyId === c.id);
  if (!sv.length || !c.categories?.length) continue;
  if (sv.some((s) => s.category === c.categories[0])) continue;
  const score = {};
  for (const s of sv) {
    const o = (score[s.category] ??= { n: 0, device: 0, core: 0 });
    o.n++; if (s.device) o.device++; if (!adjacent.has(s.type)) o.core++;
  }
  const best = Object.entries(score).sort(([ka, a], [kb, b]) => b.n - a.n || b.device - a.device || Number(c.categories.includes(kb)) - Number(c.categories.includes(ka)) || b.core - a.core)[0][0];
  // 元のカテゴリのうち事業が1件も無いものは外し、事業の多いカテゴリで埋める
  const ranked = Object.entries(score).sort(([, a], [, b]) => b.n - a.n).map(([k]) => k);
  const next = [...new Set([best, ...c.categories.filter((k) => score[k]), ...ranked])].slice(0, 3);
  console.error(`${c.name}: ${c.categories.map((k) => catName[k]).join('・')} → ${next.map((k) => catName[k]).join('・')}`);
  c.categories = next;
  c.categoryLabel = next.map((k) => catName[k]).join('・');
  changed++;
}
if (!dry) fs.writeFileSync(P('companies.json'), JSON.stringify(companies, null, 2) + '\n');
console.error(`主なカテゴリを変えた会社 ${changed} 社`);
