#!/usr/bin/env node
/**
 * 大手企業（ヘルステック企業の提携・M&A相手）を data/companies.json に足し、決算を data/earnings.json に入れる。
 *
 *   node scripts/add-major.mjs out-1.json out-2.json ...
 *
 * 入力（JSON 配列）: { code, market, industry33, company: { name, aliases, corporateNumber, hp, categories, description, overview,
 *   prefecture, address, foundedYear, representatives, employees, employeesAsOf, groupCompanies, healthcareSegments, history, sources, profile },
 *   reports: [...] }（reports は merge-earnings.mjs と同じ形）
 * - id は法人番号。法人番号が無い会社は足さない。
 * - すでにある会社（id・証券コード・社名が一致）は空いている項目だけ埋める。
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = path.join(ROOT, 'data', 'companies.json');
const companies = JSON.parse(fs.readFileSync(F, 'utf8'));
const cats = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'categories.json'), 'utf8'));
const catName = Object.fromEntries(cats.map((c) => [c.slug, c.name]));
const nm = (s = '') => s.normalize('NFKC').replace(/株式会社|ホールディングス|\s/g, '');
const asOf = new Date().toISOString().slice(0, 7);
const empty = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);

// ヘルスケアに関わるセグメントとして扱う名前。ヘルスケア単独のセグメントが無い会社（通信・商社など）で、
// 食品・通信などとまとめたセグメント全体をヘルスケアとして数えないようにする
const HC = /ヘルスケア|医療|医薬|メディカル|介護|ライフサイエンス|薬|調剤|ニュートラシューティカルズ|ヘルスサイエンス|DSB/;
const hcFix = (company, reports) => {
  const whole = (company.healthcareSegments ?? []).includes('全社');
  for (const r of reports ?? []) for (const s of r.segments ?? []) if (s.healthcare && !whole && !HC.test(s.name)) delete s.healthcare;
  if (!whole) company.healthcareSegments = (company.healthcareSegments ?? []).filter((n) => HC.test(n));
};

let added = 0, filled = 0, skipped = [];
const earnings = [];
for (const f of process.argv.slice(2)) {
  for (const x of JSON.parse(fs.readFileSync(f, 'utf8'))) {
    const c = x.company ?? {};
    const id = String(c.corporateNumber ?? '').replace(/\D/g, '');
    if (id.length !== 13) { skipped.push(`${c.name ?? x.code}（法人番号なし）`); continue; }
    hcFix(c, x.reports);
    const market = x.market ? `東証${x.market.replace(/^東証/, '')}` : undefined;
    const rec = {
      id,
      name: c.name,
      aliases: c.aliases?.filter((a) => nm(a) !== nm(c.name)),
      hp: c.hp ?? '',
      categories: (c.categories ?? []).filter((s) => catName[s]),
      categoryLabel: catName[(c.categories ?? []).find((s) => catName[s])] ?? '',
      description: c.description ?? '',
      prefecture: c.prefecture ?? '',
      foundedYear: c.foundedYear ?? null,
      address: c.address ?? '',
      employees: c.employees ?? '',
      employeesAsOf: c.employeesAsOf,
      founders: [],
      representatives: c.representatives ?? [],
      exit: '上場',
      listedMarket: market,
      securitiesCode: x.code,
      industry33: x.industry33,
      parentCompany: '',
      relatedCompanies: c.groupCompanies ?? [],
      major: true,
      groupCompanies: c.groupCompanies ?? [],
      healthcareSegments: c.healthcareSegments ?? [],
      corporateNumber: id,
      corporateNumberUrl: `https://www.houjin-bangou.nta.go.jp/henkorireki-johoto.html?selHouzinNo=${id}`,
      region: 'JP',
      source: `Healthtech DB 編集部調べ（${asOf}）`,
      overview: c.overview,
      history: (c.history ?? []).filter((h) => h?.date && h?.text).sort((a, b) => a.date.localeCompare(b.date)),
      sources: c.sources ?? [],
      updatedAt: asOf,
      profile: c.profile ? { ...c.profile, checkedAt: c.profile.checkedAt ?? asOf } : undefined,
    };
    const clean = Object.fromEntries(Object.entries(rec).filter(([, v]) => v !== undefined));
    const cur = companies.find((e) => e.id === id || (x.code && e.securitiesCode === x.code) || nm(e.name) === nm(c.name));
    if (cur) {
      for (const [k, v] of Object.entries(clean)) if (k !== 'id' && empty(cur[k]) && !empty(v)) cur[k] = v;
      cur.major = true;
      filled++;
    } else {
      companies.push(clean);
      added++;
    }
    if (x.reports?.length) earnings.push({ id: cur?.id ?? id, reports: x.reports });
  }
}
fs.writeFileSync(F, JSON.stringify(companies, null, 2) + '\n');
console.error(`大手企業 追加 ${added} 社 / 既存に補完 ${filled} 社${skipped.length ? ` / 見送り: ${skipped.join('、')}` : ''}`);
if (earnings.length) {
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'major-')), 'earn.json');
  fs.writeFileSync(tmp, JSON.stringify(earnings));
  execFileSync('node', [path.join(ROOT, 'scripts', 'merge-earnings.mjs'), tmp], { stdio: 'inherit' });
}
