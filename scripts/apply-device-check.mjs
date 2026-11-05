#!/usr/bin/env node
/**
 * 「その事業は医療機器か」を確かめた結果を data/services.json に当てる。
 *
 *   node scripts/apply-device-check.mjs out-1.json out-2.json ...
 *   node pipeline/pmda-devices.mjs            # そのあと、PMDA のページから医療機器の情報を取る
 *
 * 入力: { results: [ { id, pmdaUrl, number, source } | { id, nonDevice: { note, source, usesDevice } } | { id, status: "準備中", stage, note, source } | { id, unclear } ] }
 * - pmdaUrl：出典の先頭に PMDA のページを足す（pmda-devices.mjs が拾う）。nonDevice は消す。
 * - nonDevice：医療機器ではないと確かめた事業。理由（note）と出典を残す。
 * - 準備中：状態を準備中にし、段階（stage）を入れる。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const F = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'services.json');
const services = JSON.parse(fs.readFileSync(F, 'utf8'));
const byId = new Map(services.map((s) => [s.id, s]));
const STAGES = ['研究開発中', '開発中', '実証・臨床試験中', '承認申請中', '承認取得・発売前', '発売予定'];
const today = new Date().toISOString().slice(0, 7);
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
let dev = 0, non = 0, prep = 0, unclear = 0, missing = 0;
for (const f of process.argv.slice(2)) {
  for (const r of JSON.parse(fs.readFileSync(f, 'utf8')).results ?? []) {
    const s = byId.get(r.id);
    if (!s) { missing++; continue; }
    if (/pmda\.go\.jp\/PmdaSearch\/kikiDetail\/GeneralList\//.test(r.pmdaUrl ?? '')) {
      s.sources = [r.pmdaUrl.trim(), ...(s.sources ?? []).filter((u) => u !== r.pmdaUrl.trim())];
      if (str(r.source) && !s.sources.includes(r.source.trim())) s.sources.push(r.source.trim());
      delete s.nonDevice;
      dev++;
    } else if (r.nonDevice && str(r.nonDevice.note)) {
      s.nonDevice = Object.fromEntries(Object.entries({ note: r.nonDevice.note.trim(), source: str(r.nonDevice.source), usesDevice: str(r.nonDevice.usesDevice), checkedAt: today }).filter(([, v]) => v));
      non++;
    } else if (r.status === '準備中' && STAGES.includes(r.stage)) {
      s.status = '準備中';
      s.stage = r.stage;
      delete s.endedAt; delete s.endReasons; delete s.endReasonNote;
      if (str(r.source) && !(s.sources ?? []).includes(r.source.trim())) s.sources = [...(s.sources ?? []), r.source.trim()];
      prep++;
    } else unclear++;
  }
}
fs.writeFileSync(F, JSON.stringify(services, null, 2) + '\n');
console.error(`医療機器（PMDA のページを足した）${dev} 件 / 医療機器ではない ${non} 件 / 準備中 ${prep} 件 / 確かめきれず ${unclear} 件 / id が無い ${missing} 件`);
