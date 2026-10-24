#!/usr/bin/env node
/**
 * 調べた事業・サービスの記録を data/services.json（事業データベース）に取り込む。
 *
 *   node scripts/merge-services.mjs --as-of 2026-10 out-ended.json out-stopped.json
 *   node scripts/merge-services.mjs --theme cloud-emr out-theme-cloud-emr.json   # テーマを付けて取り込む（data/themes.json の slug）
 *
 * 入力（JSON 配列）: { name, companyId, companyName, category, summary, startedAt, status, endedAt, successor,
 *   milestones, endReasons, endReasonNote, lessons, sources, hp }
 * - 同じ会社の同じ名前の事業は1件にまとめる（あとから来た項目で上書き）。
 * - id は「b-」＋（社名＋事業名）のハッシュ。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (f) => path.join(ROOT, 'data', f);
const args = process.argv.slice(2);
let asOf = new Date().toISOString().slice(0, 7);
const files = [];
let theme = '';
for (let i = 0; i < args.length; i++) (args[i] === '--as-of' ? (asOf = args[++i]) : args[i] === '--theme' ? (theme = args[++i]) : files.push(args[i]));

const services = JSON.parse(fs.readFileSync(P('services.json'), 'utf8'));
const companies = JSON.parse(fs.readFileSync(P('companies.json'), 'utf8'));
const cats = new Set(JSON.parse(fs.readFileSync(P('categories.json'), 'utf8')).map((c) => c.slug));
// 事業の種類（type）があれば、その種類のカテゴリに入れる
const typeCat = new Map((fs.existsSync(P('taxonomy.json')) ? JSON.parse(fs.readFileSync(P('taxonomy.json'), 'utf8')) : []).flatMap((c) => c.types.map((t) => [t.slug, c.category])));
const REASONS = new Set(['regulation', 'reimbursement', 'no-payer', 'workflow', 'evidence', 'funding', 'parent-strategy', 'acquisition', 'competition', 'team', 'infrastructure', 'unknown']);
const STATUS = new Set(['提供中', '終了', '譲渡', '統合', '休止', '不明']);
const norm = (s = '') => s.normalize('NFKC').replace(/株式会社|合同会社|[\s「」『』（）()・]/g, '').toLowerCase();
const key = (company, name) => `${norm(company)}|${norm(name)}`;
const byKey = new Map(services.map((s) => [key(s.company, s.name), s]));
// 別の調査で同じ事業が別の書き方で入ることがある（「LINEドクター」と「オンライン診療「LINEドクター」」など）。
// 「」の中身か、括弧より前の名前が同じものは重複の候補として最後に知らせる（まとめるのは scripts/fold-services.mjs）
const core = (name) => norm((name.match(/「([^」]+)」/) ?? [])[1] ?? name.replace(/[（(].*$/, ''));
const suspects = [];

let added = 0, updated = 0;
const skipped = [];
for (const f of files) {
  for (const x of JSON.parse(fs.readFileSync(f, 'utf8'))) {
    if (!x.name) continue;
    const co = x.companyId ? companies.find((c) => c.id === x.companyId) : undefined;
    const company = co?.name ?? x.companyName ?? '';
    const status = STATUS.has(x.status) ? x.status : '不明';
    const category = typeCat.get(x.type) ?? (cats.has(x.category) ? x.category : co?.categories?.[0] ?? '');
    if (!category) { skipped.push(`${x.name}（カテゴリ不明）`); continue; }
    const rec = {
      name: x.name.trim(),
      company,
      ...(co ? { companyId: co.id } : {}),
      category,
      description: (x.summary ?? '').trim(),
      hp: x.hp ?? '',
      startedYear: /^\d{4}/.test(x.startedAt ?? '') ? Number(x.startedAt.slice(0, 4)) : null,
      status,
      ...(x.startedAt ? { startedAt: x.startedAt } : {}),
      ...(x.endedAt ? { endedAt: x.endedAt } : {}),
      ...(x.successor ? { successor: x.successor } : {}),
      ...(x.milestones?.length ? { milestones: x.milestones.filter((m) => m.text).sort((a, b) => (a.date || '').localeCompare(b.date || '')) } : {}),
      ...(status !== '提供中' ? { endReasons: (x.endReasons ?? []).filter((r) => REASONS.has(r)) } : {}),
      ...(x.endReasonNote ? { endReasonNote: x.endReasonNote.trim() } : {}),
      ...(x.lessons ? { lessons: x.lessons.trim() } : {}),
      sources: x.sources ?? [],
      ...(typeCat.has(x.type) ? { type: x.type } : {}),
      updatedAt: asOf,
    };
    const themes = theme ? [theme] : [];
    if (rec.endReasons && !rec.endReasons.length) rec.endReasons = ['unknown'];
    const k = key(company, rec.name);
    const prev = byKey.get(k);
    if (prev) { Object.assign(prev, rec, { sources: [...new Set([...(prev.sources ?? []), ...rec.sources])], themes: [...new Set([...(prev.themes ?? []), ...themes])] }); updated++; continue; }
    const twin = services.find((x) => core(x.name) === core(rec.name));
    if (twin) suspects.push(`${twin.id} ${twin.name} ⇔ ${rec.name}`);
    const id = 'b-' + crypto.createHash('sha1').update(k).digest('hex').slice(0, 8);
    const s = { id, ...rec, ...(themes.length ? { themes } : {}) };
    services.push(s);
    byKey.set(k, s);
    added++;
  }
}
fs.writeFileSync(P('services.json'), JSON.stringify(services, null, 2) + '\n');
console.error(`事業 追加 ${added} / 更新 ${updated} / 見送り ${skipped.length} → 合計 ${services.length} 件`);
skipped.forEach((s) => console.error('  - ' + s));
if (suspects.length) {
  console.error(`重複の可能性 ${suspects.length} 件（同じ事業なら scripts/fold-services.mjs でまとめる）:`);
  suspects.forEach((s) => console.error('  ? ' + s));
}
