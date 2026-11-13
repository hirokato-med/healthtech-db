#!/usr/bin/env node
/**
 * 企業データの空欄を埋めた結果と、企業DBに無かった会社を足す結果を data/companies.json に当てる。
 *
 *   node scripts/apply-company-fill.mjs --fill ver-1.json ...     # 空欄を埋める（入っている値は変えない）
 *   node scripts/apply-company-fill.mjs --new ver-1.json ...      # 事業だけ載っていた会社を企業DBに足し、事業とつなぐ
 *
 * 入力はどちらも配列か、検証済みの { items: [...], verification: [...] }。
 * --fill: { id, prefecture, address, foundedYear, representatives, overview, description, closed, sources }
 *   - 空いている項目だけ埋める。description は今の説明が25字未満のときだけ置き換える。
 *   - closed（清算・合併など）は exit を「閉鎖」にして ended に残す。
 * --new: { company, serviceIds, match | skip | name, corporateNumber, hp, categories, description, overview, prefecture, address,
 *          foundedYear, representatives, exit, listedMarket, securitiesCode, parentCompany, sources, note }
 *   - match（既存の会社 id）か、法人番号・社名が同じ会社が既にあれば、その会社に事業をつなぐだけ。
 *   - 無ければ会社を足し（id は法人番号）、事業の会社名をその正式名にそろえる。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (f) => path.join(ROOT, 'data', f);
const load = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const save = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2) + '\n');
const items = (f) => { const d = load(f); return Array.isArray(d) ? d : d.items ?? d.results ?? []; };
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const asOf = new Date().toISOString().slice(0, 7);

const mode = process.argv[2];
const files = process.argv.slice(3);
const companies = load(P('companies.json'));
const services = load(P('services.json'));
const people = load(P('people.json'));
const cats = Object.fromEntries(load(P('categories.json')).map((c) => [c.slug, c.name]));
const typeCat = new Map(load(P('taxonomy.json')).flatMap((c) => c.types.map((t) => [t.slug, c.category])));
const byId = new Map(companies.map((c) => [c.id, c]));
const norm = (s = '') => s.normalize('NFKC').toLowerCase().replace(/株式会社|有限会社|合同会社|一般社団法人|\(株\)|inc\.?|co\.?,?\s*ltd\.?|corporation/g, '').replace(/[\s・\-_.,、。'’"()（）]/g, '');
const byName = new Map(companies.flatMap((c) => [c.name, ...(c.aliases ?? []), ...(c.formerNames ?? [])].map((n) => [norm(n), c])));
const personId = (name) => 'p-' + crypto.createHash('sha1').update(name).digest('hex').slice(0, 8);
const addRole = (name, c, title) => {
  name = name.trim();
  if (!name) return;
  let p = people.find((x) => x.name === name);
  if (!p) { p = { id: personId(name), name, roles: [] }; people.push(p); }
  if (!p.roles.some((r) => r.companyId === c.id)) p.roles.push({ companyId: c.id, companyName: c.name, title });
};
const empty = (v) => v == null || v === '' || (Array.isArray(v) && !v.length) || v === 0;

let filled = 0, closed = 0, added = 0, linked = 0, skipped = 0, svcLinked = 0;
const notes = [];
if (mode === '--fill') {
  for (const f of files) for (const x of items(f)) {
    const c = byId.get(x.id);
    if (!c) { skipped++; continue; }
    let any = false;
    for (const k of ['prefecture', 'address', 'overview']) if (empty(c[k]) && str(x[k])) { c[k] = x[k].trim(); any = true; }
    if (empty(c.foundedYear) && Number.isInteger(x.foundedYear) && x.foundedYear > 1800 && x.foundedYear <= 2026) { c.foundedYear = x.foundedYear; any = true; }
    if (empty(c.representatives) && Array.isArray(x.representatives) && x.representatives.filter(str).length) {
      c.representatives = x.representatives.filter(str).map((s) => s.trim());
      c.representatives.forEach((n) => addRole(n, c, '代表者'));
      any = true;
    }
    if (str(x.description) && (c.description ?? '').length < 25) { c.description = x.description.trim(); any = true; }
    if (x.closed && str(x.closed.date) && c.exit !== '閉鎖') {
      c.previousExit = c.exit;
      c.exit = '閉鎖';
      c.ended = { date: x.closed.date.slice(0, 7), note: [str(x.closed.how), '（国税庁 法人番号公表サイトほか）'].filter(Boolean).join('') };
      if (str(x.closed.source)) c.sources = [...new Set([...(c.sources ?? []), x.closed.source.trim()])];
      closed++; any = true;
    }
    if (any) {
      c.sources = [...new Set([...(c.sources ?? []), ...(x.sources ?? []).filter(str)])];
      c.updatedAt = asOf;
      filled++;
    }
  }
} else if (mode === '--new') {
  const svcById = new Map(services.map((s) => [s.id, s]));
  for (const f of files) for (const x of items(f)) {
    if (x.skip || (!x.match && !str(x.name))) { skipped++; continue; }
    let c = (x.match && byId.get(x.match)) || (/^\d{13}$/.test(x.corporateNumber ?? '') && byId.get(x.corporateNumber)) || byName.get(norm(x.name ?? '')) || null;
    if (c) linked++;
    else {
      const svcCats = (x.serviceIds ?? []).map((id) => typeCat.get(svcById.get(id)?.type)).filter(Boolean);
      const categories = [...new Set([...(x.categories ?? []).filter((s) => cats[s]), ...svcCats])].slice(0, 3);
      if (!categories.length) { skipped++; notes.push(`カテゴリ不明: ${x.name}`); continue; }
      const corp = /^\d{13}$/.test(x.corporateNumber ?? '') ? x.corporateNumber : '';
      if (!corp) { skipped++; notes.push(`法人番号なし: ${x.name}`); continue; }
      c = {
        id: corp, name: x.name.trim(), hp: str(x.hp) ?? '', categories, categoryLabel: categories.map((s) => cats[s]).join('・'),
        description: str(x.description) ?? '', prefecture: str(x.prefecture) ?? '', foundedYear: Number.isInteger(x.foundedYear) ? x.foundedYear : null,
        address: str(x.address) ?? '', employees: '', founders: [], representatives: (x.representatives ?? []).filter(str),
        exit: ['上場', '未上場'].includes(x.exit) ? x.exit : '未上場',
        parentCompany: str(x.parentCompany) ?? '', relatedCompanies: [], corporateNumber: corp,
        corporateNumberUrl: `https://www.houjin-bangou.nta.go.jp/henkorireki-johoto.html?selHouzinNo=${corp}`, region: 'JP',
        source: `Healthtech DB 編集部調べ（${asOf}）`, sources: (x.sources ?? []).filter(str), updatedAt: asOf,
        ...(str(x.overview) ? { overview: x.overview.trim() } : {}),
        ...(str(x.listedMarket) ? { listedMarket: x.listedMarket.trim() } : {}),
        ...(str(x.securitiesCode) ? { securitiesCode: String(x.securitiesCode).trim() } : {}),
      };
      companies.push(c); byId.set(c.id, c); byName.set(norm(c.name), c);
      c.representatives.forEach((n) => addRole(n, c, '代表者'));
      added++;
    }
    for (const id of x.serviceIds ?? []) {
      const s = svcById.get(id);
      if (!s || s.companyId === c.id) continue;
      s.companyId = c.id;
      s.company = c.name;
      svcLinked++;
    }
  }
  save(P('services.json'), services);
} else {
  throw new Error('usage: apply-company-fill.mjs --fill|--new files...');
}
save(P('companies.json'), companies);
save(P('people.json'), people);
console.error(`空欄を埋めた ${filled} 社（閉鎖 ${closed}）／足した会社 ${added} 社・既存につないだ ${linked} 社・事業をつないだ ${svcLinked} 件／見送り ${skipped} 件`);
notes.slice(0, 30).forEach((n) => console.error('  - ' + n));
