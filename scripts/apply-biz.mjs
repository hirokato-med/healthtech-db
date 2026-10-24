#!/usr/bin/env node
/**
 * 事業の種類ごとに確かめた結果を事業データベースに当てる。
 *
 *   node scripts/apply-biz.mjs out-1.json out-2.json ...
 *
 * 入力: { updates: [{ id, startedAt, status, endedAt, endReasons, endReasonNote, sources, remove, note }],
 *         adds: [{ type, name, company, companyId, summary, startedAt, status, endedAt, endReasons, endReasonNote, lessons, sources, hp }] }
 * - updates: 空でない項目だけ当てる。startBasis（何の日付か）、knownSince（開始が分からないときの提供を確認できた最も古い時点）、milestones（運営会社の移り変わり・改称）も当てる。出典は先頭に足す。remove は事業データベースから外す。
 *   開始時期が「会社設立」の日付でしか分からないもの（note に会社設立とあるもの）は開始時期に使わない。
 * - adds: merge-services.mjs に渡す（type から事業の種類とカテゴリを決める）。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = path.join(ROOT, 'data', 'services.json');
const outs = process.argv.slice(2).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const services = JSON.parse(fs.readFileSync(F, 'utf8'));
const byId = new Map(services.map((s) => [s.id, s]));
const REASONS = new Set(['regulation', 'reimbursement', 'no-payer', 'workflow', 'evidence', 'funding', 'parent-strategy', 'acquisition', 'competition', 'team', 'infrastructure', 'unknown']);
const STATUS = new Set(['提供中', '終了', '譲渡', '統合', '休止', '不明']);
const asOf = new Date().toISOString().slice(0, 7);
let started = 0, stopped = 0, removed = 0, skippedFounding = 0, known = 0, miles = 0, cleared = 0;
const drop = new Set();
for (const o of outs) {
  for (const u of o.updates ?? []) {
    const s = byId.get(u.id);
    if (!s) continue;
    if (u.remove) { drop.add(s.id); removed++; continue; }
    if (/^\d{4}(-\d{2})?$/.test(u.startedAt ?? '')) {
      // 会社設立の日付、Wikipedia、後年の資料からの逆算は開始時期に使わない（一次情報だけ）
      // 何の日付か（startBasis）があればそれで、なければ note で判断する
      const basis = u.startBasis ? u.startBasis : (u.note ?? '');
      if (/^会社設立|会社の設立|設立日|法人設立|Wikipedia|ウィキペディア|逆算|予定|FDA|カナダ|米国|海外|根拠は報道|報道のみ|見出しのみ|試作/.test(basis) || /見出しだけ|見出しのみ|報道が根拠|根拠は報道|試作/.test(u.note ?? '')) skippedFounding++;
      else if (u.startedAt !== s.startedAt) { s.startedAt = u.startedAt; s.startedYear = Number(u.startedAt.slice(0, 4)); started++; }
    }
    // 何の日付か（正式提供開始・β版・前の運営会社で開始など）と、開始が見つからないときの「提供を確認できた最も古い時点」
    // 既存の開始時期が会社の設立時期にすぎず、それより前から提供していたと分かったもの：開始時期を外し、提供を確認できた最古の時点にする
    if (u.startedAt === '' && /^\d{4}(-\d{2})?$/.test(u.knownSince ?? '') && s.startedAt) { delete s.startedAt; s.startedYear = null; delete s.startBasis; cleared++; }
    if (u.startBasis && s.startedAt === u.startedAt) s.startBasis = u.startBasis;
    if (/^\d{4}(-\d{2})?$/.test(u.knownSince ?? '') && !s.startedAt) { s.knownSince = u.knownSince; if (u.knownSinceSource) s.knownSinceSource = u.knownSinceSource; known++; }
    // 運営会社の移り変わり・改称などの節目（同じ年月・同じ文は足さない）
    for (const m of u.milestones ?? []) {
      if (!m?.date || !m?.text) continue;
      s.milestones ??= [];
      if (!s.milestones.some((x) => x.date === m.date && x.text.slice(0, 12) === m.text.slice(0, 12))) { s.milestones.push(m); miles++; }
      s.milestones.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    }
    if (u.status && STATUS.has(u.status) && u.status !== s.status) { if (u.status !== '提供中') stopped++; s.status = u.status; }
    if (u.endedAt) s.endedAt = u.endedAt;
    if (u.endReasons?.length) s.endReasons = u.endReasons.filter((r) => REASONS.has(r));
    if (u.endReasonNote) s.endReasonNote = u.endReasonNote;
    if (u.sources?.length) s.sources = [...new Set([...u.sources, ...(s.sources ?? [])])];
    s.updatedAt = asOf;
  }
}
fs.writeFileSync(F, JSON.stringify(services.filter((s) => !drop.has(s.id)), null, 2) + '\n');
console.error(`開始時期を外した ${cleared} 件 / 節目 ${miles} 件・提供を確認できた最古の時点 ${known} 件 / 開始時期を入れた ${started} 件（会社設立・Wikipedia・逆算しか根拠がなく見送り ${skippedFounding} 件）/ 止まっていた ${stopped} 件 / 外した ${removed} 件`);

const adds = outs.flatMap((o) => o.adds ?? []).filter((a) => a.name && a.type).map((a) => ({ ...a, companyName: a.company, companyId: a.companyId || undefined }));
if (adds.length) {
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'biz-')), 'adds.json');
  fs.writeFileSync(tmp, JSON.stringify(adds));
  execFileSync('node', [path.join(ROOT, 'scripts', 'merge-services.mjs'), '--as-of', asOf, tmp], { stdio: 'inherit' });
}
