#!/usr/bin/env node
/**
 * 過去の企業一覧を追跡した結果（いまの姿と事業の歴史）を取り込む。
 *
 *   node scripts/apply-vlist.mjs out-1.json out-2.json
 *
 * 入力（JSON 配列）: { listName, decision: add|ended|existing|out, dbId, reason, company: {...}, services: [...] }
 * - add / ended の会社は add-triaged.mjs で企業DBへ（ended は事業を終えた会社として記録）。
 *   add でも「活動実態は未確認」のものは区分を「活動停止（確認できず）」にする。
 * - 事業（services）は merge-services.mjs で事業DBへ。会社は法人番号（add/ended）か dbId（existing）でつなぐ。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vlist-'));
const items = process.argv.slice(2).flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const id13 = (v) => String(v ?? '').replace(/\D/g, '');
const run = (s, ...a) => execFileSync('node', [path.join(ROOT, 'scripts', s), ...a], { stdio: 'inherit' });

// 1. 会社（add-triaged.mjs の形にする）
const tri = items.filter((x) => ['add', 'ended', 'existing'].includes(x.decision)).map((x) => ({
  ...(x.company ?? {}), company: x.listName, decision: x.decision, dbId: x.dbId, reason: x.reason,
  ended: x.company?.ended, rounds: [],
}));
fs.writeFileSync(path.join(tmp, 'tri.json'), JSON.stringify(tri));
run('add-triaged.mjs', path.join(tmp, 'tri.json'));

// 2. 活動を確かめられない会社
const F = path.join(ROOT, 'data', 'companies.json');
const companies = JSON.parse(fs.readFileSync(F, 'utf8'));
const byId = new Map(companies.map((c) => [c.id, c]));
let unknown = 0;
for (const x of items.filter((i) => i.decision === 'add' && /活動実態は未確認|活動を確認できない/.test(i.reason ?? ''))) {
  const c = byId.get(id13(x.company?.corporateNumber));
  if (c && c.exit === '未上場') { c.previousExit = c.exit; c.exit = '活動停止'; c.statusNote = '法人は存続しているが、公式サイト・発表から事業の実態を確認できない'; unknown++; }
}
fs.writeFileSync(F, JSON.stringify(companies, null, 2) + '\n');

// 3. 事業
const svc = items.flatMap((x) => {
  const cid = x.decision === 'existing' ? x.dbId : id13(x.company?.corporateNumber);
  const co = byId.get(cid);
  return (x.services ?? []).filter((s) => s.name && s.type).map((s) => ({ ...s, companyId: co ? cid : undefined, companyName: co?.name ?? x.company?.name ?? x.listName }));
});
fs.writeFileSync(path.join(tmp, 'svc.json'), JSON.stringify(svc));
run('apply-biz.mjs', ((f) => (fs.writeFileSync(f, JSON.stringify({ adds: svc })), f))(path.join(tmp, 'adds.json')));
console.error(`活動を確かめられない会社 ${unknown} 社 / 事業 ${svc.length} 件`);
