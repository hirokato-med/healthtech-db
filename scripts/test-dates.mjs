#!/usr/bin/env node
/**
 * 表示用の日付（src/lib/date.ts）が、ビルドする環境のタイムゾーンに左右されず日本時間で出るかを確かめる。
 * 自分自身を TZ を変えて起動し直し、どの TZ でも同じ結果になることを見る。1つでも外れたら終了コード1。
 *   node scripts/test-dates.mjs
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fmtDate, fmtDateJa, jstYmd } from '../src/lib/date.ts';

const CASES = [
  // [入力, 一覧用, 文中用, YYYY-MM-DD]
  ['2026-11-18T15:40:01Z', '2026.11.19', '2026年11月19日', '2026-11-19'], // 日本時間 11/19 0:40
  ['2026-11-18T14:59:59Z', '2026.11.18', '2026年11月18日', '2026-11-18'], // 日本時間 11/18 23:59
  ['2026-11-18T23:13:00.000Z', '2026.11.19', '2026年11月19日', '2026-11-19'],
  ['2026-12-31T15:00:00Z', '2027.01.01', '2027年1月1日', '2027-01-01'], // 年をまたぐ
  ['2026-11-19T00:40:00+09:00', '2026.11.19', '2026年11月19日', '2026-11-19'],
  ['2026-10-23', '2026.10.23', '2026年10月23日', '2026-10-23'], // 日付だけは換算しない
  ['', '', '', ''],
  ['不明', '不明', '不明', '不明'],
];

if (process.argv[2] === '--child') {
  const bad = CASES.filter(([iso, a, b, c]) => fmtDate(iso) !== a || fmtDateJa(iso) !== b || jstYmd(iso) !== c)
    .map(([iso]) => `${iso} → ${fmtDate(iso)} / ${fmtDateJa(iso)} / ${jstYmd(iso)}`);
  if (bad.length) { console.error(`TZ=${process.env.TZ}: ${bad.join('; ')}`); process.exit(1); }
  process.exit(0);
}
let failed = 0;
for (const tz of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
  try {
    execFileSync(process.execPath, ['--no-warnings', fileURLToPath(import.meta.url), '--child'], { env: { ...process.env, TZ: tz }, stdio: ['ignore', 'inherit', 'inherit'] });
    console.log(`ok  TZ=${tz}`);
  } catch {
    failed++;
    console.log(`NG  TZ=${tz}`);
  }
}
process.exit(failed ? 1 : 0);
