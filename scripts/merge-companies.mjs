#!/usr/bin/env node
/**
 * 調べた企業データを data/companies.json と data/people.json に取り込む。
 *
 *   node scripts/merge-companies.mjs --as-of 2026-10 new-a.json new-b.json --updates updates.json
 *
 * 追加ファイル（JSON 配列）: { name, hp, categories, description, prefecture, foundedYear, address,
 *   founders, representatives, exit, parentCompany, corporateNumber, services, note, sources }
 * 更新ファイル（JSON 配列）: { id, name, changes: { exit, listedMarket, eventDate, parentCompany,
 *   representatives, hp, renamedFrom }, summary, sources }
 *
 * - 既存と同じ会社（社名のゆらぎ・公式サイトのドメインで判定）は追加しない。
 * - id は法人番号（13桁）。無ければ jp-NNN を振る。
 * - 創業者・代表者は人物DBにも足す。
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
const adds = [];
const updates = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--as-of') asOf = args[++i];
  else if (args[i] === '--updates') updates.push(args[++i]);
  else adds.push(args[i]);
}

const companies = load(P('companies.json'));
const people = load(P('people.json'));
const cats = load(P('categories.json'));
const catName = Object.fromEntries(cats.map((c) => [c.slug, c.name]));

const norm = (s = '') =>
  s.normalize('NFKC').toLowerCase()
    .replace(/株式会社|有限会社|合同会社|一般社団法人|\(株\)|inc\.?|co\.?,?\s*ltd\.?|corporation/g, '')
    .replace(/[\s・\-_.,、。'’"()（）]/g, '');
const host = (u = '') => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
const personId = (name) => 'p-' + crypto.createHash('sha1').update(name).digest('hex').slice(0, 8);

const byName = new Map(companies.map((c) => [norm(c.name), c]));
const byHost = new Map(companies.filter((c) => host(c.hp)).map((c) => [host(c.hp), c]));
const ids = new Set(companies.map((c) => c.id));
let seq = Math.max(0, ...companies.filter((c) => c.id.startsWith('jp-')).map((c) => Number(c.id.slice(3)))) + 1;
const nextId = () => { while (ids.has(`jp-${String(seq).padStart(3, '0')}`)) seq++; return `jp-${String(seq++).padStart(3, '0')}`; };

const addRole = (name, c, title) => {
  name = name.trim();
  if (!name) return;
  let p = people.find((x) => x.name === name);
  if (!p) { p = { id: personId(name), name, roles: [] }; people.push(p); }
  const r = p.roles.find((x) => x.companyId === c.id);
  if (!r) p.roles.push({ companyId: c.id, companyName: c.name, title });
  else if (r.title !== title && !r.title.includes(title)) r.title = r.title === '創業者' ? '創業者・代表者' : `${r.title}・${title}`;
};

// ---------- 追加 ----------
let added = 0;
const skipped = [];
for (const f of adds) {
  for (const x of load(f)) {
    const dup = byName.get(norm(x.name)) ?? (host(x.hp) && byHost.get(host(x.hp)));
    if (!x.name || dup) { skipped.push(`${x.name}（既存: ${dup?.name ?? '社名なし'}）`); continue; }
    const categories = (x.categories ?? []).filter((s) => catName[s]);
    if (!categories.length) { skipped.push(`${x.name}（カテゴリ不明）`); continue; }
    const corp = /^\d{13}$/.test(x.corporateNumber ?? '') && !ids.has(x.corporateNumber) ? x.corporateNumber : '';
    const c = {
      id: corp || nextId(),
      name: x.name.trim(),
      hp: x.hp ?? '',
      categories,
      categoryLabel: categories.map((s) => catName[s]).join('・'),
      description: x.description ?? '',
      prefecture: x.prefecture ?? '',
      foundedYear: Number.isInteger(x.foundedYear) ? x.foundedYear : null,
      address: x.address ?? '',
      employees: '',
      founders: x.founders ?? [],
      representatives: x.representatives ?? [],
      exit: ['未上場', '上場', 'バイアウト'].includes(x.exit) ? x.exit : '未上場',
      parentCompany: x.parentCompany ?? '',
      relatedCompanies: [],
      corporateNumber: corp,
      corporateNumberUrl: corp ? `https://www.houjin-bangou.nta.go.jp/henkorireki-johoto.html?selHouzinNo=${corp}` : '',
      region: 'JP',
      source: `Healthtech DB 編集部調べ（${asOf}）`,
      ...(x.services?.length ? { products: x.services } : {}),
      ...(x.note ? { highlight: x.note } : {}),
      sources: x.sources ?? [],
      updatedAt: asOf,
    };
    companies.push(c);
    ids.add(c.id);
    byName.set(norm(c.name), c);
    if (host(c.hp)) byHost.set(host(c.hp), c);
    c.founders.forEach((n) => addRole(n, c, '創業者'));
    c.representatives.forEach((n) => addRole(n, c, '代表者'));
    added++;
  }
}

// ---------- 既存の更新 ----------
let changed = 0;
for (const f of updates) {
  for (const u of load(f)) {
    const c = companies.find((x) => x.id === u.id);
    if (!c) { skipped.push(`更新対象なし: ${u.id} ${u.name}`); continue; }
    const ch = u.changes ?? {};
    if (ch.renamedFrom || (u.name && u.name !== c.name)) {
      c.formerNames = [...new Set([...(c.formerNames ?? []), ch.renamedFrom || c.name])];
      c.name = u.name;
      for (const p of people) for (const r of p.roles) if (r.companyId === c.id) r.companyName = c.name;
    }
    if (ch.exit) c.exit = ch.exit;
    if (ch.listedMarket) c.listedMarket = ch.listedMarket;
    if (ch.parentCompany) c.parentCompany = ch.parentCompany;
    if (ch.hp) c.hp = ch.hp;
    if (ch.representatives?.length) {
      c.representatives = ch.representatives;
      ch.representatives.forEach((n) => addRole(n, c, '代表者'));
    }
    if (u.summary) {
      c.history = [...(c.history ?? []).filter((h) => h.text !== u.summary), { date: ch.eventDate ?? '', text: u.summary }]
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    }
    c.sources = [...new Set([...(c.sources ?? []), ...(u.sources ?? [])])];
    c.updatedAt = asOf;
    changed++;
  }
}

save(P('companies.json'), companies);
save(P('people.json'), people);
console.error(`追加 ${added} 社 / 更新 ${changed} 社 / 見送り ${skipped.length} 件 → 合計 ${companies.length} 社・人物 ${people.length} 名`);
if (skipped.length) console.error(skipped.map((s) => '  - ' + s).join('\n'));
