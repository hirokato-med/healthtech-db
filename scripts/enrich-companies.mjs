#!/usr/bin/env node
/**
 * 既存企業の調べ直した内容（事業概要・サービス・従業員数など）を data/companies.json に当てる。
 *
 *   node scripts/enrich-companies.mjs --as-of 2026-10 out-1.json out-2.json ...
 *
 * 入力（JSON 配列）: { id, description, overview, products, highlight, employees, employeesAsOf,
 *   totalFunding, foundedYear, address, founders, representatives, hp, status, sources }
 * - id で既存企業を探す。社名は変えない（社名変更は merge-companies.mjs の --updates で行う）。
 * - 入っている項目だけ上書きする。空の項目で既存の値を消さない。
 * - 代表者・創業者が変わったら人物DBに足し、交代した前の代表者からは「代表者」を外す。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (f) => path.join(ROOT, 'data', f);
const load = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const save = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2) + '\n');

const args = process.argv.slice(2);
let asOf = new Date().toISOString().slice(0, 7);
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--as-of') asOf = args[++i];
  else files.push(args[i]);
}

const companies = load(P('companies.json'));
const people = load(P('people.json'));
const byId = new Map(companies.map((c) => [c.id, c]));
const personId = (name) => 'p-' + crypto.createHash('sha1').update(name).digest('hex').slice(0, 8);
const addRole = (name, c, title) => {
  name = name.trim();
  if (!name) return;
  let p = people.find((x) => x.name === name);
  if (!p) { p = { id: personId(name), name, roles: [] }; people.push(p); }
  const r = p.roles.find((x) => x.companyId === c.id);
  if (!r) p.roles.push({ companyId: c.id, companyName: c.name, title });
  else if (!r.title.includes(title)) r.title = r.title === '創業者' ? '創業者・代表者' : `${r.title}・${title}`;
};
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const list = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

let done = 0;
const missing = [];
const thin = [];
for (const f of files) {
  for (const x of load(f)) {
    const c = byId.get(x.id);
    if (!c) { missing.push(`${x.id} ${x.name ?? ''}`); continue; }
    if (x.status && x.status !== '確認できた') thin.push(`${c.name}（${x.status}）`);
    for (const k of ['description', 'overview', 'highlight', 'totalFunding', 'address', 'hp']) if (str(x[k])) c[k] = str(x[k]);
    if (str(x.employees)) {
      // 2021年の投入データの「50~100」などは、時点つきの新しい値で置き換える
      c.employees = str(x.employees);
      c.employeesAsOf = str(x.employeesAsOf) || asOf;
    }
    if (Number.isInteger(x.foundedYear)) c.foundedYear = x.foundedYear; // 公式サイトで確かめた設立年を優先
    if (list(x.products).length) c.products = [...new Set(list(x.products))];
    if (list(x.founders).length && !c.founders.length) { c.founders = list(x.founders); c.founders.forEach((n) => addRole(n, c, '創業者')); }
    if (list(x.representatives).length) { c.representatives = list(x.representatives); c.representatives.forEach((n) => addRole(n, c, '代表者')); }
    c.sources = [...new Set([...(c.sources ?? []), ...list(x.sources)])];
    c.updatedAt = asOf;
    done++;
  }
}

// 人物DBの役職を企業側の創業者・代表者に合わせる（交代した前の代表者から「代表者」を外す）
for (const p of people) {
  p.roles = p.roles.flatMap((r) => {
    const c = byId.get(r.companyId);
    if (!c) return [r];
    const f = c.founders.includes(p.name);
    const rep = c.representatives.includes(p.name);
    const title = f && rep ? '創業者・代表者' : f ? '創業者' : rep ? '代表者' : '';
    return title ? [{ ...r, companyName: c.name, title }] : [];
  });
}
const kept = people.filter((p) => p.roles.length);

save(P('companies.json'), companies);
save(P('people.json'), kept);
console.error(`人物 ${people.length} → ${kept.length} 名`);
console.error(`充実 ${done} 社 / id 不一致 ${missing.length} 件 / 情報が少ない・停止 ${thin.length} 社`);
if (missing.length) console.error(missing.map((s) => '  - id 不一致: ' + s).join('\n'));
if (thin.length) console.error(thin.map((s) => '  - ' + s).join('\n'));
