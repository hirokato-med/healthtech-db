#!/usr/bin/env node
/**
 * 会社の主なカテゴリ（categories[0]）を、その会社の「いま提供している事業」にそろえる。
 *
 * 判定の順番（登録された事業の件数をそのまま会社全体の分類にしない）：
 *  1. categoryLocked の会社は変えない（会社の公式な事業説明を見て手で決めたもの）。
 *  2. 主なカテゴリに当たる事業がある（提供中・準備中・終了を問わない）なら変えない。
 *  3. いま提供中・準備中の事業が2件未満なら変えない（会社全体を代表できないため）。一覧に出して人が見る。
 *  4. 3を満たすときだけ、提供中・準備中の事業が最も多いカテゴリを主にする。
 *     同数なら、医療機器の承認がある事業 → 元からあるカテゴリ → デジタルヘルスの中心（周辺でない）の順。
 *  元のカテゴリは、何かしら事業があるものだけ残し、提供中の事業の多いカテゴリで埋める（最大3つ）。
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
const LIVE = new Set(['提供中', '準備中']);

let changed = 0;
const review = [];
for (const c of companies) {
  if (c.categoryLocked || !c.categories?.length) continue;
  const sv = services.filter((s) => s.companyId === c.id);
  if (!sv.length || sv.some((s) => s.category === c.categories[0])) continue;
  const live = sv.filter((s) => LIVE.has(s.status));
  if (live.length < 2) { review.push(`${c.name}（提供中の事業 ${live.length}件）：${c.categories.map((k) => catName[k]).join('・')}`); continue; }
  const score = {};
  for (const s of live) {
    const o = (score[s.category] ??= { n: 0, device: 0, core: 0 });
    o.n++; if (s.device) o.device++; if (!adjacent.has(s.type)) o.core++;
  }
  const ranked = Object.entries(score).sort(([ka, a], [kb, b]) => b.n - a.n || b.device - a.device || Number(c.categories.includes(kb)) - Number(c.categories.includes(ka)) || b.core - a.core).map(([k]) => k);
  const anySvc = new Set(sv.map((s) => s.category));
  const next = [...new Set([ranked[0], ...c.categories.filter((k) => anySvc.has(k)), ...ranked])].slice(0, 3);
  if (dry) console.error(`${c.name}: ${c.categories.map((k) => catName[k]).join('・')} → ${next.map((k) => catName[k]).join('・')}`);
  c.categories = next;
  c.categoryLabel = next.map((k) => catName[k]).join('・');
  changed++;
}
if (!dry) fs.writeFileSync(P('companies.json'), JSON.stringify(companies, null, 2) + '\n');
console.error(`主なカテゴリを変えた会社 ${changed} 社／提供中の事業が少なく変えなかった会社 ${review.length} 社（人が見る）`);
if (process.argv.includes('--review')) review.forEach((r) => console.error('  - ' + r));
