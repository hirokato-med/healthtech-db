#!/usr/bin/env node
/**
 * 新しく入れた会社の中身（事業概要・外形情報・従業員数・事業・決算）をまとめて取り込む。
 *
 *   node scripts/apply-enrich.mjs out-1.json out-2.json ...
 *
 * 入力（JSON 配列）: { id, description, overview, hp, representatives, foundedYear, employees, employeesAsOf, employeesSource,
 *   profile, services: [{ name, type, summary, startedAt, status, endedAt, sources, hp }], reports: [...], flag, flagReason, sources }
 * - 会社の項目は enrich-companies.mjs、事業は merge-services.mjs（type から事業の種類とカテゴリ）、決算は merge-earnings.mjs に渡す。
 * - flag（ended / out）は取り込まずに一覧で知らせる（編集部が確かめて apply-company-updates.mjs で当てる）。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'enrich-'));
const items = process.argv.slice(2).flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const asOf = new Date().toISOString().slice(0, 7);
const run = (script, file, ...args) => execFileSync('node', [path.join(ROOT, 'scripts', script), ...args, file], { stdio: 'inherit' });
const w = (name, data) => { const f = path.join(tmp, name); fs.writeFileSync(f, JSON.stringify(data)); return f; };

const companies = items.map((x) => Object.fromEntries(Object.entries({
  id: x.id, description: x.description, overview: x.overview, hp: x.hp, representatives: x.representatives?.length ? x.representatives : undefined,
  foundedYear: x.foundedYear, employees: x.employees || undefined, employeesAsOf: x.employees ? x.employeesAsOf : undefined,
  profile: x.profile, sources: [...(x.sources ?? []), ...(x.employeesSource ? [x.employeesSource] : [])],
}).filter(([, v]) => v !== undefined && v !== '' && v !== null)));
run('enrich-companies.mjs', w('co.json', companies), '--as-of', asOf);

const services = items.flatMap((x) => (x.services ?? []).filter((s) => s.name).map((s) => ({ ...s, companyId: x.id })));
run('merge-services.mjs', w('sv.json', services), '--as-of', asOf);

const reports = items.filter((x) => x.reports?.length).map((x) => ({ id: x.id, reports: x.reports }));
if (reports.length) run('merge-earnings.mjs', w('er.json', reports));

const flags = items.filter((x) => x.flag);
console.error(`中身を入れた会社 ${companies.length} 社 / 事業 ${services.length} 件（種類あり ${services.filter((s) => s.type).length}）/ 決算 ${reports.length} 社`);
if (flags.length) console.error('確かめが要る会社:\n  ' + flags.map((x) => `${x.id} ${x.flag}: ${x.flagReason ?? ''}`).join('\n  '));
