#!/usr/bin/env node
/**
 * 資金調達リストなどから振り分けた会社を取り込む。
 *
 *   node scripts/add-triaged.mjs triage-out-1.json triage-out-2.json ...
 *
 * 入力（JSON 配列）: { company, decision: add|ended|out|existing, dbId, reason, name, corporateNumber, hp, prefecture,
 *   foundedYear, representatives, description, categories, exit, ended: { date, note }, rounds: [...], sources }
 * - add / ended: 法人番号のある会社を merge-companies.mjs で企業DBに足し、ended は事業を終えた会社として記録する。
 * - existing: 既存の会社（dbId）に調達の回だけを足す。
 * - 調達の回は merge-fundings.mjs --append で足す（重複は足さない）。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'triage-'));
const items = process.argv.slice(2).flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const id13 = (v) => String(v ?? '').replace(/\D/g, '');

const adds = items.filter((x) => ['add', 'ended'].includes(x.decision) && id13(x.corporateNumber).length === 13 && x.name);
const add = adds.map((x) => ({
  name: x.name, hp: x.hp ?? '', categories: x.categories ?? [], description: x.description ?? '', prefecture: x.prefecture ?? '',
  foundedYear: x.foundedYear ?? null, address: x.address ?? '', founders: x.founders ?? [], representatives: x.representatives ?? [],
  exit: x.decision === 'ended' ? (/合併/.test(x.exit ?? '') ? '合併' : '閉鎖') : (x.exit || '未上場'),
  parentCompany: x.parentCompany ?? '', corporateNumber: id13(x.corporateNumber), sources: x.sources ?? [],
}));
fs.writeFileSync(path.join(tmp, 'add.json'), JSON.stringify(add));
execFileSync('node', [path.join(ROOT, 'scripts', 'merge-companies.mjs'), '--as-of', new Date().toISOString().slice(0, 7), path.join(tmp, 'add.json')], { stdio: 'inherit' });

// 事業を終えた会社の記録（ended）
const F = path.join(ROOT, 'data', 'companies.json');
const companies = JSON.parse(fs.readFileSync(F, 'utf8'));
const byId = new Map(companies.map((c) => [c.id, c]));
let ended = 0;
for (const x of adds.filter((a) => a.decision === 'ended')) {
  const c = byId.get(id13(x.corporateNumber));
  if (c && !c.ended) { c.ended = { ...(x.ended?.date ? { date: x.ended.date } : {}), note: x.ended?.note || x.reason || '事業を終えた' }; ended++; }
}
fs.writeFileSync(F, JSON.stringify(companies, null, 2) + '\n');

// 調達の回
const fund = items
  .map((x) => ({ id: x.decision === 'existing' ? x.dbId : id13(x.corporateNumber), rounds: x.rounds ?? [] }))
  .filter((x) => x.id && byId.has(x.id) && x.rounds.length);
fs.writeFileSync(path.join(tmp, 'fund.json'), JSON.stringify(fund));
execFileSync('node', [path.join(ROOT, 'scripts', 'merge-fundings.mjs'), '--append', path.join(tmp, 'fund.json')], { stdio: 'inherit' });

const n = (d) => items.filter((x) => x.decision === d).length;
console.error(`振り分け: 追加 ${n('add')} / 事業を終えた ${n('ended')}（記録 ${ended}）/ 既存 ${n('existing')} / 対象外 ${n('out')} / 法人番号なしで見送り ${items.filter((x) => ['add', 'ended'].includes(x.decision) && id13(x.corporateNumber).length !== 13).length}`);
