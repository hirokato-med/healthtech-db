#!/usr/bin/env node
/**
 * 一次情報で確かめた企業の変化（買収・親会社・事業転換・一時停止など）を data/companies.json に当てる。
 *
 *   node scripts/apply-company-updates.mjs updates.json [--dry]
 *
 * 入力（JSON 配列）: { id, verified, exit, parentCompany, parentNote, renameTo, scopeNote, statusNote, hp,
 *   removeProducts, history: [{date, text, source}], ended, stoppedServices: [...], sources }
 * - verified が true のものだけ当てる。
 * - history は同じ年月・似た文があれば足さない。sources は合わせる。
 * - stoppedServices は事業DBに渡す形（merge-services.mjs の入力）にして <入力>.services.json に書き出す。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = path.join(ROOT, 'data', 'companies.json');
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const file = args.find((a) => !a.startsWith('--'));
const companies = JSON.parse(fs.readFileSync(F, 'utf8'));
const byId = new Map(companies.map((c) => [c.id, c]));
const norm = (s = '') => s.normalize('NFKC').replace(/\s/g, '');
const similar = (a, b) => {
  const x = new Set(norm(a)), y = norm(b);
  let hit = 0;
  for (const ch of y) if (x.has(ch)) hit++;
  return hit / Math.max(1, y.length) > 0.7;
};

const services = [];
const log = { exit: 0, parent: 0, history: 0, status: 0, scope: 0, hp: 0, rename: 0, ended: 0, products: 0 };
let missing = 0;
for (const u of JSON.parse(fs.readFileSync(file, 'utf8'))) {
  if (!u.verified) continue;
  const c = byId.get(u.id);
  if (!c) { missing++; continue; }
  if (u.renameTo && u.renameTo !== c.name) { c.formerNames = [...new Set([...(c.formerNames ?? []), c.name])]; c.name = u.renameTo; log.rename++; }
  if (u.exit && u.exit !== c.exit) { c.exit = u.exit; log.exit++; }
  if (u.parentCompany && u.parentCompany !== c.parentCompany) { c.parentCompany = u.parentCompany; log.parent++; }
  if (u.parentNote) c.parentNote = u.parentNote;
  if (u.scopeNote) { c.scopeNote = u.scopeNote; log.scope++; }
  if (u.statusNote) { c.statusNote = u.statusNote; log.status++; }
  if (u.hp && u.hp !== c.hp) { c.hp = u.hp; log.hp++; }
  if (u.ended) { c.ended = u.ended; log.ended++; }
  if (u.removeProducts?.length && c.products) {
    const before = c.products.length;
    c.products = c.products.filter((p) => !u.removeProducts.some((r) => norm(p).includes(norm(r)) || norm(r).includes(norm(p))));
    log.products += before - c.products.length;
  }
  for (const h of u.history ?? []) {
    c.history ??= [];
    if (c.history.some((x) => (x.date ?? '').slice(0, 7) === (h.date ?? '').slice(0, 7) && similar(x.text, h.text))) continue;
    c.history.push(h);
    log.history++;
  }
  c.history?.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  if (u.sources?.length) c.sources = [...new Set([...(c.sources ?? []), ...u.sources])];
  for (const s of u.stoppedServices ?? []) services.push({ ...s, companyId: c.id, summary: s.description ?? s.summary ?? '' });
}
if (!dry) {
  fs.writeFileSync(F, JSON.stringify(companies, null, 2) + '\n');
  if (services.length) fs.writeFileSync(file.replace(/\.json$/, '') + '.services.json', JSON.stringify(services, null, 1));
}
console.error(`更新: ${Object.entries(log).map(([k, v]) => `${k} ${v}`).join(' / ')} / 止まった事業 ${services.length} 件 / id 不一致 ${missing}${dry ? '（--dry）' : ''}`);
