#!/usr/bin/env node
/**
 * 企業DBの親会社・合併・近況から、M&A・資本関係のつながりを data/relations.json に書き出す（M&Aマップの元データ）。
 *
 *   node scripts/build-relations.mjs
 *
 * - 親会社（parentCompany）→ 子会社: type "parent"（買収・子会社化・グループ入り）
 * - 合併先（mergedInto）→ 消滅会社: type "merger"
 * - data/partnerships.json（提携マップ）と data/relations-extra.json の出資・提携も線にする
 * - 時期は近況（history）の「子会社・買収・TOB・グループ・合併」などの記述から取る。
 * - 親会社が企業DBに無い会社（オムロン、日本生命など）も、DB外の会社として点にする。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (f) => path.join(ROOT, 'data', f);
const companies = JSON.parse(fs.readFileSync(P('companies.json'), 'utf8'));

const norm = (s = '') =>
  s.normalize('NFKC').replace(/株式会社|有限会社|合同会社|相互会社|ホールディングス|HD\b|\s/g, '').replace(/[（(][^）)]*[）)]/g, '').toLowerCase();
const byNorm = new Map();
for (const c of companies) for (const n of [c.name, ...(c.aliases ?? []), ...(c.formerNames ?? [])]) if (norm(n)) byNorm.set(norm(n), c);

// 親会社欄の表記ゆれ・注記を落とす（「メドピア株式会社:51%」「EQT（Curie1株式会社として買収）」など）
const cleanParent = (s) =>
  s.split(/[,、，\n]/).map((x) => x.replace(/[:：]\s*[\d.]+%|[\d.]+%|100%子会社|（[^）]*）|\([^)]*\)/g, '').trim()).filter(Boolean);

const nodes = new Map();
const node = (name) => {
  const c = byNorm.get(norm(name));
  const id = c ? c.id : `ext:${norm(name)}`;
  if (!nodes.has(id)) nodes.set(id, c ? { id, name: c.name, companyId: c.id, exit: c.exit, category: c.categories[0] ?? '' } : { id, name: name.replace(/株式会社$/, '').trim() || name });
  return id;
};
const DEAL = /子会社|買収|TOB|公開買付|全株式|株式の\d+%|グループ(入り|に参画|に入|の一員)|傘下|参画|譲受|取得/;
const dateOf = (c, keys) => {
  const hs = (c.history ?? []).filter((h) => h.date && DEAL.test(h.text) && (!keys.length || keys.some((k) => norm(h.text).includes(k))));
  const any = (c.history ?? []).filter((h) => h.date && DEAL.test(h.text));
  return (hs[0] ?? any[0])?.date ?? '';
};

const edges = [];
for (const c of companies) {
  const to = node(c.name);
  for (const p of cleanParent(c.parentCompany ?? '')) {
    const from = node(p);
    if (from === to) continue;
    edges.push({ from, to, type: 'parent', date: dateOf(c, [norm(p).slice(0, 4)]) });
  }
  if (c.mergedInto) {
    const from = c.mergedInto.companyId ?? node(c.mergedInto.name);
    if (c.mergedInto.companyId) node(byNorm.get(norm(c.mergedInto.name))?.name ?? c.mergedInto.name);
    edges.push({ from, to, type: 'merger', date: c.ended?.date ?? '' });
  }
}
// 提携マップのデータ（data/partnerships.json）と、追加のつながり（data/relations-extra.json）も線にする
for (const f of ['partnerships.json', 'relations-extra.json'].map(P).filter((f) => fs.existsSync(f))) {
  for (const e of JSON.parse(fs.readFileSync(f, 'utf8'))) {
    if (edges.some((x) => x.from === node(e.from) && x.to === node(e.to) && x.type === e.type)) continue;
    edges.push({ from: node(e.from), to: node(e.to), type: e.type, date: e.date ?? '', ...(e.note ? { note: e.note } : {}), ...(e.sources ? { sources: e.sources } : {}) });
  }
}
// 線のある点だけ残す
const used = new Set(edges.flatMap((e) => [e.from, e.to]));
const out = { nodes: [...nodes.values()].filter((n) => used.has(n.id)), edges };
fs.writeFileSync(P('relations.json'), JSON.stringify(out, null, 1) + '\n');
console.error(`relations.json: 点 ${out.nodes.length}（DB外 ${out.nodes.filter((n) => !n.companyId).length}）/ 線 ${edges.length}（親子 ${edges.filter((e) => e.type === 'parent').length}・合併 ${edges.filter((e) => e.type === 'merger').length}・その他 ${edges.filter((e) => !['parent', 'merger'].includes(e.type)).length}）`);
