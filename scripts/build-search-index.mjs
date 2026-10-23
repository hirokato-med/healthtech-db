#!/usr/bin/env node
/** data/ と content/ から検索用インデックス public/search-index.json を作る（next build の前に走る）。 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
const categories = read('categories.json');
const catName = Object.fromEntries(categories.map((c) => [c.slug, c.name]));
const out = [];
for (const c of read('companies.json'))
  out.push({ t: 'company', id: c.id, title: c.name, sub: [...(c.aliases ?? []), ...(c.formerNames ?? []), c.categoryLabel, c.prefecture, c.description.slice(0, 60)].filter(Boolean).join(' / '), url: `/companies/${c.id}/` });
for (const s of read('services.json'))
  out.push({ t: 'service', id: s.id, title: s.name, sub: [s.company, catName[s.category] ?? s.category].filter(Boolean).join(' / '), url: `/services/${s.id}/` });
for (const p of read('people.json'))
  out.push({ t: 'person', id: p.id, title: p.name, sub: p.roles.map((r) => `${r.companyName} ${r.title}`).join(' / '), url: `/talents/${p.id}/` });
for (const c of categories) out.push({ t: 'category', id: c.slug, title: c.name, sub: c.groupLabel, url: `/categories/${c.slug}/` });
for (const o of read('overseas.json')) out.push({ t: 'overseas', id: o.id, title: o.name, sub: [o.country, ...o.areas].join(' / '), url: `/global/#${o.id}` });
if (fs.existsSync(path.join(ROOT, 'data', 'monthly.json')))
  for (const e of read('monthly.json')) {
    const [y, m] = e.month.split('-');
    out.push({ t: 'monthly', id: e.videoId, title: e.theme || `${Number(m)}月のヘルステックニュース振り返り`, sub: `#月刊ヘルステック ${y}年${Number(m)}月`, url: `/monthly/#${e.videoId}` });
  }
const dir = path.join(ROOT, 'content', 'articles');
if (fs.existsSync(dir))
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    const fm = raw.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    const get = (k) => fm.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm'))?.[1] ?? '';
    const slug = get('slug') || f.replace(/\.md$/, '');
    out.push({ t: 'article', id: slug, title: get('title'), sub: get('summary').slice(0, 80), url: `/articles/${slug}/` });
  }
fs.mkdirSync(path.join(ROOT, 'public'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'public', 'search-index.json'), JSON.stringify(out));
console.error(`search-index.json: ${out.length}件`);
