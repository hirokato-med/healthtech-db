#!/usr/bin/env node
/**
 * 医療ビジネスチャンネル（YouTube @digitalhealthch）の「#月刊ヘルステック」の配信回を集めて data/monthly.json に書く。
 * 毎月、加藤浩晃・有村琢磨がその月のヘルステックニュースを振り返る YouTube Live。
 *
 *   node pipeline/youtube.mjs
 *
 * - チャンネル内検索「月刊ヘルステック」とライブ配信タブから動画を拾い、タイトルに「月刊ヘルステック」を含むものだけ残す。
 * - 動画ページは読まない（短時間に読むと 429 になる）。対象月はタイトルの「2026年8月」から取る。
 * - テーマはタイトルの「…」から取る。タイトルに無い回はサムネイルの文字を data/monthly.json に手で書く（マージ時に残る）。
 * - 既存の data/monthly.json とマージする（同じ videoId は上書き）。新しい順に保存。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
/** YouTube はブラウザ以外の UA だと一覧を短く返すので、ブラウザの UA と日本語で取る */
async function fetchText(url) {
  const { stdout } = await run('curl', ['-sSL', '--max-time', '30', '-A', BROWSER_UA, '-H', 'Accept-Language: ja', '-w', '\n%{http_code}', url], { maxBuffer: 30 * 1024 * 1024 });
  const cut = stdout.lastIndexOf('\n');
  const status = Number(stdout.slice(cut + 1));
  if (status < 200 || status >= 400) throw new Error(`HTTP ${status}`);
  return stdout.slice(0, cut);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'data', 'monthly.json');
const CH = 'https://www.youtube.com/@digitalhealthch';
const QUERIES = ['月刊ヘルステック', 'ヘルステックニュース 振り返り', '月刊ヘルステック 2025', '月刊ヘルステック 2026', 'Live 加藤浩晃 有村琢磨'];
const PAGES = [`${CH}/streams`, ...QUERIES.map((q) => `${CH}/search?query=${encodeURIComponent(q)}`)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const initialData = (html) => {
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  return m ? JSON.parse(m[1]) : null;
};
const found = new Map();
const walk = (o) => {
  if (Array.isArray(o)) return o.forEach(walk);
  if (!o || typeof o !== 'object') return;
  if (o.videoRenderer) {
    const v = o.videoRenderer;
    const t = (v.title?.runs ?? []).map((r) => r.text).join('') || v.title?.simpleText || '';
    found.set(v.videoId, t);
  }
  if (o.lockupViewModel?.contentId && o.lockupViewModel.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO') {
    found.set(o.lockupViewModel.contentId, o.lockupViewModel.metadata?.lockupMetadataViewModel?.title?.content ?? '');
  }
  Object.values(o).forEach(walk);
};
// 短時間に取りすぎると 429 になるので、ページごとに間を空け、429 のときは待ってから 1 回だけやり直す
for (const url of PAGES) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const d = initialData(await fetchText(url));
      if (d) walk(d);
      break;
    } catch (e) {
      console.error(`${url}: ${e.message}`);
      if (!/429/.test(e.message)) break;
      await sleep(20000);
    }
  }
  await sleep(3000);
}

const existing = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : [];
const byId = new Map(existing.map((x) => [x.videoId, x]));
// 「#月刊ヘルステック」と、その第1回（2024年12月の「ヘルスケア市場 総振り返り」）
const target = [...found].filter(([, t]) => /月刊ヘルステック|ヘルステックニュース\s*振り返り|ヘルスケア市場\s*総振り返り/.test(t) && /有村/.test(t));

for (const [id, title] of target) {
  const prev = byId.get(id);
  const m = title.match(/(\d{4})年(\d{1,2})月/);
  const y = title.match(/(\d{4})年の/);
  const month = m ? `${m[1]}-${m[2].padStart(2, '0')}` : y ? `${y[1]}-12` : prev?.month ?? '';
  // 「…」があればそれをテーマに。年末の総振り返り回は【Live】と出演者名を除いた題名をテーマにする
  const theme = title.match(/「([^」]+)」/)?.[1] || (y && !m ? title.replace(/【[^】]*】/g, '').trim() : '') || prev?.theme || '';
  byId.set(id, { ...prev, videoId: id, title, month, theme, url: `https://www.youtube.com/watch?v=${id}` });
}

const items = [...byId.values()].filter((x) => x.month).sort((a, b) => b.month.localeCompare(a.month));
fs.writeFileSync(FILE, JSON.stringify(items, null, 2) + '\n');
console.error(`monthly.json: ${items.length}回（今回の取得 ${target.length}件）`);
