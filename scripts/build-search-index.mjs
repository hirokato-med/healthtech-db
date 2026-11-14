#!/usr/bin/env node
/** data/ と content/ から検索用インデックス public/search-index.json を作る（next build の前に走る）。 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
const categories = read('categories.json');
const catName = Object.fromEntries(categories.map((c) => [c.slug, c.name]));
// 事業の種類の名前（検索の手がかり k に入れる。画面には出さない）
const typeName = Object.fromEntries(read('taxonomy.json').flatMap((c) => c.types.map((t) => [t.slug, t.name])));
const services = read('services.json');
// 治療用アプリ（DTx）そのものの事業。事業の種類の名前（「睡眠アプリ・不眠症治療アプリ」など）だけで DTx の検索に出さないための印
// 「治療用アプリ（DTx）」の種類には診断支援のプログラム医療機器も入っているので、治療に使うものだけを印にする
const DTX_RE = /治療用アプリ|治療アプリ|治療補助アプリ|dtx|デジタル治療|デジタルセラピューティクス|デジタル療法/i;
const THERAPY = /治療|療法|セラピー|訓練|リハビリ|禁煙|卒煙|減酒/;
// 開発・薬事・販売を支えるサービス（SaMD 開発支援・承認取得支援など）は、治療用アプリそのものとは別の区分にする
const SUPPORT = /支援|受託|代行|コンサル|QMS|認証取得|承認取得|開発受託|導入/;
const isSupport = (s) => SUPPORT.test(s.name);
const isDtx = (s) => {
  const t = `${s.name} ${s.description ?? ''}`;
  if (/診断支援|診断補助|検査用|画像解析|読影/.test(s.name) || isSupport(s)) return false;
  // 治療が終わったあとの管理サービス（治療アプリ完了後の血圧管理 など）は治療用アプリそのものではない
  if (/完了後|修了後|卒業後/.test(s.name)) return false;
  return DTX_RE.test(t) || (s.type === 'digital-therapeutics' && THERAPY.test(t));
};
const out = [];
for (const c of read('companies.json')) {
  // 会社の事業の種類（DTx の会社を「治療用アプリ」でも探せるように）
  const mine = services.filter((s) => s.companyId === c.id);
  const types = [...new Set(mine.map((s) => typeName[s.type]).filter(Boolean))];
  out.push({ t: 'company', id: c.id, title: c.name, sub: [...(c.aliases ?? []), ...(c.formerNames ?? []), c.categoryLabel, c.prefecture, c.description.slice(0, 60)].filter(Boolean).join(' / '), k: mine.some(isDtx) ? '治療用アプリ' : '', ty: types.join(' '), url: `/companies/${c.id}/` });
}
for (const s of services)
  out.push({ t: 'service', id: s.id, title: s.name, sub: [s.company, catName[s.category] ?? s.category].filter(Boolean).join(' / '), k: [isDtx(s) ? '治療用アプリ' : '', s.formerName, (s.description ?? '').slice(0, 80)].filter(Boolean).join(' '), ty: typeName[s.type], ...(isSupport(s) ? { sec: 'support' } : /完了後|修了後|卒業後/.test(s.name) ? { sec: 'related' } : {}), url: `/services/${s.id}/` });
for (const p of read('people.json'))
  out.push({ t: 'person', id: p.id, title: p.name, sub: p.roles.map((r) => `${r.companyName} ${r.title}`).join(' / '), url: `/talents/${p.id}/` });
for (const c of categories) out.push({ t: 'category', id: c.slug, title: c.name, sub: c.groupLabel, url: `/categories/${c.slug}/` });
for (const o of read('overseas.json').filter((o) => !o.hidden)) out.push({ t: 'overseas', id: o.id, title: o.name, sub: [o.country, ...o.areas].join(' / '), url: `/global/#${o.id}` });
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
