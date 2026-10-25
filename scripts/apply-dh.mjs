#!/usr/bin/env node
/**
 * デジタルヘルスの調査結果（足す事業・直す事業）を取り込む。DB に無い運営会社は法人番号で企業DBに足す。
 *
 *   node scripts/apply-dh.mjs out.json [--pending pending.json]
 *
 * 入力: { adds: [{ name, company, companyId, corporateNumber, companyHp, type, summary, startedAt, ... }],
 *         updates: [{ id, ..., sameAs, companyId }] }（形は scripts/apply-biz.mjs と同じ）
 * - 運営会社が DB に無く法人番号（13桁）があれば、merge-companies.mjs で足す（説明は足す事業の名前から作る）。
 * - まだ提供が始まっていないもの（status が空で note に「未提供」）は足さず、--pending のファイルに残す。
 * - updates の companyId は運営会社の付け替え、sameAs は scripts/fold-services.mjs でまとめる。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (f) => path.join(ROOT, 'data', f);
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const args = process.argv.slice(2);
const pi = args.indexOf('--pending');
const pendingFile = pi >= 0 ? args.splice(pi, 2)[1] : null;
const input = read(args[0]);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dh-'));
const run = (script, ...a) => execFileSync('node', [path.join(ROOT, 'scripts', script), ...a], { stdio: 'inherit' });
const id13 = (v) => String(v ?? '').replace(/\D/g, '');

const unreleased = (a) => !a.status && /未提供/.test(a.note ?? '') && !/未提供ではない/.test(a.note ?? '');
const pending = (input.adds ?? []).filter(unreleased);
let adds = (input.adds ?? []).filter((a) => !unreleased(a)).map((a) => ({ ...a, status: a.status || '不明' }));
if (pendingFile) fs.writeFileSync(pendingFile, JSON.stringify(pending, null, 1));

// 1. DB に無い運営会社を足す
const companies = read(P('companies.json'));
const ids = new Set(companies.map((c) => c.id));
const typeCat = new Map(read(P('taxonomy.json')).flatMap((c) => c.types.map((t) => [t.slug, c.category])));
const newCos = new Map();
for (const a of adds) {
  const n = id13(a.corporateNumber);
  if (a.companyId && ids.has(a.companyId)) continue;
  if (n.length !== 13) continue;
  if (ids.has(n)) { a.companyId = n; continue; }
  const c = newCos.get(n) ?? { name: a.company, hp: a.companyHp ?? '', corporateNumber: n, categories: [], services: [], sources: [] };
  const cat = typeCat.get(a.type);
  if (cat && !c.categories.includes(cat)) c.categories.push(cat);
  c.services.push(a.name.replace(/（.*?）/g, ''));
  c.sources.push(`https://www.houjin-bangou.nta.go.jp/henkorireki-johoto.html?selHouzinNo=${n}`, ...(a.companyHp ? [a.companyHp] : []));
  newCos.set(n, c);
  a.companyId = n;
}
if (newCos.size) {
  const list = [...newCos.values()].map(({ services, ...c }) => ({
    ...c, sources: [...new Set(c.sources)], exit: '未上場',
    description: `${services.slice(0, 3).join('、')}${services.length > 3 ? 'など' : ''}を提供する。`,
  }));
  fs.writeFileSync(path.join(tmp, 'cos.json'), JSON.stringify(list));
  run('merge-companies.mjs', path.join(tmp, 'cos.json'));
}
const skipped = adds.filter((a) => !a.companyId && !a.company);
adds = adds.filter((a) => !skipped.includes(a));

// 2. 事業を足す・直す
fs.writeFileSync(path.join(tmp, 'biz.json'), JSON.stringify({ adds, updates: input.updates ?? [] }));
run('apply-biz.mjs', path.join(tmp, 'biz.json'));

// 3. 運営会社の付け替えとまとめ
const services = read(P('services.json'));
const cos = new Map(read(P('companies.json')).map((c) => [c.id, c]));
let moved = 0;
for (const u of input.updates ?? []) {
  const s = services.find((x) => x.id === u.id);
  if (s && u.companyId && cos.has(u.companyId)) { s.companyId = u.companyId; s.company = cos.get(u.companyId).name; moved++; }
}
fs.writeFileSync(P('services.json'), JSON.stringify(services, null, 2) + '\n');
const have = new Set(services.map((s) => s.id));
for (const u of (input.updates ?? []).filter((x) => x.sameAs && have.has(x.id) && have.has(x.sameAs))) run('fold-services.mjs', u.sameAs, u.id);
console.error(`新しい会社 ${newCos.size} 社 / 運営会社の付け替え ${moved} 件 / 未提供で保留 ${pending.length} 件 / 会社が分からず見送り ${skipped.length} 件`);
