#!/usr/bin/env node
/**
 * 事業の説明文を書き直した結果を事業データベースに当てる。
 *
 *   node scripts/apply-desc.mjs out-1.json out-2.json ...
 *
 * 入力（JSON 配列）: { id, description, name, startedAt, startBasis, milestones, status, endedAt, sources, remove, sameAs, note, skip }
 * - description・name（変えたときは前の名前を formerName に）・状態・終了時期を当てる。出典は先頭に足す。
 * - 開始時期は根拠が会社設立・報道・逆算などでなければ当てる。note で「会社設立日」「一次情報なし」などとされた開始時期は外す。
 * - sameAs は scripts/fold-services.mjs と同じやり方でまとめる。remove は外す。
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = path.join(ROOT, 'data', 'services.json');
const items = process.argv.slice(2).flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const asOf = new Date().toISOString().slice(0, 7);
const STATUS = new Set(['提供中', '準備中', '終了', '譲渡', '統合', '休止', '不明']);
const weak = /報道|見出し|会社設立|設立日|逆算|Wikipedia|ウィキペディア|予定|試作/;
const badStart = /会社設立|設立年月|設立日|子会社化の時期|採択|一次情報なし|開始日ではない/;

let services = JSON.parse(fs.readFileSync(F, 'utf8'));
const byId = new Map(services.map((s) => [s.id, s]));
const drop = new Set();
let desc = 0, renamed = 0, started = 0, cleared = 0, stopped = 0, skipped = 0;
for (const x of items) {
  const s = byId.get(x.id);
  if (!s || x.skip) { skipped++; continue; }
  if (x.remove) { drop.add(x.id); continue; }
  if (x.description) { s.description = x.description.trim(); desc++; }
  if (x.name && x.name !== s.name) { s.formerName ??= s.name; s.name = x.name.trim(); renamed++; }
  if (x.startedAt && !weak.test(x.startBasis ?? '')) {
    s.startedAt = x.startedAt; s.startedYear = Number(x.startedAt.slice(0, 4)); if (x.startBasis) s.startBasis = x.startBasis; delete s.knownSince; started++;
  } else if (!x.startedAt && s.startedAt && badStart.test(x.note ?? '')) {
    delete s.startedAt; delete s.startBasis; s.startedYear = null; cleared++;
  }
  if (x.milestones?.length) {
    const seen = new Set((s.milestones ?? []).map((m) => `${m.date}|${m.text}`));
    s.milestones = [...(s.milestones ?? []), ...x.milestones.filter((m) => m.text && !seen.has(`${m.date}|${m.text}`))].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }
  if (STATUS.has(x.status) && x.status !== s.status) { s.status = x.status; stopped++; }
  if (x.endedAt) s.endedAt = x.endedAt;
  if (s.status !== '提供中' && !s.endReasons?.length) s.endReasons = ['unknown'];
  if (x.sources?.length) s.sources = [...new Set([...x.sources, ...(s.sources ?? [])])];
  s.updatedAt = asOf;
}
fs.writeFileSync(F, JSON.stringify(services.filter((s) => !drop.has(s.id)), null, 2) + '\n');
for (const x of items.filter((i) => i.sameAs && byId.has(i.id) && byId.has(i.sameAs))) {
  execFileSync('node', [path.join(ROOT, 'scripts', 'fold-services.mjs'), x.sameAs, x.id], { stdio: 'inherit' });
}
console.error(`説明文 ${desc} 件 / 名前 ${renamed} 件 / 開始時期を入れた ${started} 件・外した ${cleared} 件 / 状態を変えた ${stopped} 件 / 外した ${drop.size} 件 / 見送り ${skipped} 件`);
