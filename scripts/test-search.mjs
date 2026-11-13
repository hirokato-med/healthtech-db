#!/usr/bin/env node
/**
 * サイト内検索の回帰テスト。public/search-index.json を作り直してから、検索語ごとに
 * 「出るべきもの」「出てはいけないもの」を確かめる。1つでも外れたら終了コード1。
 *   node scripts/test-search.mjs
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { search } from '../src/lib/search-match.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
execFileSync('node', [path.join(ROOT, 'scripts', 'build-search-index.mjs')], { stdio: 'ignore' });
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'search-index.json'), 'utf8'));

// [検索語, 上位に出るべきもの（タイトルの一部）, 出てはいけないもの（タイトルの一部）]
const CASES = [
  ['DTx', ['CureApp', 'サスメド', 'Medcle'], ['DTX Studio']],
  ['dtx', ['CureApp'], ['DTX Studio']],
  ['ＤＴｘ', ['CureApp'], ['DTX Studio']],
  ['デジタル治療', ['CureApp', 'サスメド'], ['DTX Studio']],
  ['治療用アプリ', ['CureApp', 'サスメド'], []],
  ['治療アプリ', ['CureApp', 'HAUDY'], []],
  ['オンライン診療', ['CLINICS'], []],
  ['遠隔診療', ['CLINICS'], []],
  ['Ubie', ['Ubie'], []],
  ['ユビー', ['ユビー'], []],
  ['メドレー', ['メドレー'], []],
  ['DTX Studio', ['DTX Studio'], []],
];

let fail = 0;
for (const [q, want, never] of CASES) {
  const hits = search(index, q, 200);
  const titles = hits.map((h) => h.title + ' ' + h.sub);
  const miss = want.filter((w) => !titles.some((t) => t.includes(w)));
  const bad = never.filter((w) => titles.some((t) => t.includes(w)));
  const ok = !miss.length && !bad.length;
  if (!ok) fail++;
  console.log(`${ok ? '○' : '●'} 「${q}」 ${hits.length}件${miss.length ? ` ／出ない：${miss.join('、')}` : ''}${bad.length ? ` ／出てはいけない：${bad.join('、')}` : ''}`);
}
console.log(fail ? `外れ ${fail} 件` : 'すべて通過');
process.exit(fail ? 1 : 0);
