#!/usr/bin/env node
/**
 * 事業の出典にある PMDA の医療機器ページ（添付文書検索の GeneralList）から、医療機器としての情報を集めて
 * data/services.json の device に入れる。
 *
 *   node pipeline/pmda-devices.mjs            # device が無い事業だけ
 *   node pipeline/pmda-devices.mjs --all      # すべて取り直す
 *   node pipeline/pmda-devices.mjs --limit 5  # 試しに5件
 *
 * device: { kind: 承認|認証|届出, number, regulatoryClass: 一般医療機器|管理医療機器|高度管理医療機器,
 *   classLabel: クラスI|クラスII|クラスIII・IV, genericName, jmdn, salesName, maker, approvedAt, category,
 *   specialMaintenance, pmdaUrl, insertUrl, insertDate, checkedAt }
 * - 区分・番号・一般的名称・JMDN コードは最新の添付文書（PDF）の冒頭から読む。承認年月日は PMDA のページから。
 * - 取れなかった項目は入れない。curl と pdftotext を使う。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { addUpdate, todayJst } from './lib/updates.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = path.join(ROOT, 'data', 'services.json');
const services = JSON.parse(fs.readFileSync(F, 'utf8'));
const all = process.argv.includes('--all');
const li = process.argv.indexOf('--limit');
const limit = li >= 0 ? Number(process.argv[li + 1]) : Infinity;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pmda-'));
const BASE = 'https://www.pmda.go.jp/PmdaSearch/kikiDetail/';
const sleep = (ms) => execFileSync('sleep', [String(ms / 1000)]);
const get = (url, out) => execFileSync('curl', ['-sL', '--max-time', '60', '-A', 'Mozilla/5.0', '-o', out, url]);
const text = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').split('\n').map((l) => l.trim()).filter(Boolean);
const CLASS = { 一般医療機器: 'クラスI', 管理医療機器: 'クラスII', 高度管理医療機器: 'クラスIII・IV' };
const today = new Date().toISOString().slice(0, 7);

function readDevice(pmdaUrl) {
  const page = path.join(tmp, 'p.html');
  get(pmdaUrl, page);
  const html = fs.readFileSync(page, 'utf8');
  const lines = text(html);
  const d = { pmdaUrl };
  const gi = lines.indexOf('主たる一般的名称');
  if (gi >= 0 && lines[gi + 1]) d.genericName = lines[gi + 1];
  // 同じ一般的名称の製品が1ページに並ぶので、URL の番号（例 30200BZX00271000）を含む行だけを読む
  const num = (pmdaUrl.match(/GeneralList\/([0-9A-Z]+)_/) ?? [])[1];
  const row = html.split(/<tr[\s>]/).find((r) => num && r.includes(`_${num}_`));
  if (row) {
    const cells = text(row);
    const mk = cells.find((l) => /^(製造販売|外国特例)／/.test(l));
    if (mk) { d.maker = mk.replace(/^[^／]+／/, ''); d.salesName = cells[cells.indexOf(mk) - 1]; }
  }
  const ai = lines.indexOf('承認年月日等');
  const date = ai >= 0 ? lines.slice(ai, ai + 8).find((l) => /^\d{4}年\d{2}月\d{2}日$/.test(l)) : undefined;
  if (date && lines.filter((l) => /^\d{4}年\d{2}月\d{2}日$/.test(l)).length === 1) d.approvedAt = date.replace(/(\d{4})年(\d{2})月(\d{2})日/, '$1-$2-$3');
  const pdf = (row ?? '').match(/href='\.\.\/ResultDataSetPDF\/([^']+)'>PDF \((\d{4})年(\d{2})月(\d{2})日\)/);
  if (pdf) {
    d.insertUrl = BASE + 'ResultDataSetPDF/' + pdf[1];
    d.insertDate = `${pdf[2]}-${pdf[3]}-${pdf[4]}`;
    const file = path.join(tmp, 'a.pdf');
    sleep(500);
    get(d.insertUrl, file);
    let head = '';
    try { head = execFileSync('pdftotext', ['-l', '1', '-enc', 'UTF-8', file, '-'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().slice(0, 1500); } catch { /* PDF でない */ }
    const no = head.match(/(承認|認証|届出)番号[：:\s]*([0-9A-Z]{10,20})/);
    if (no) { d.kind = no[1]; d.number = no[2]; }
    const rc = head.match(/(高度管理医療機器|管理医療機器|一般医療機器)/);
    if (rc) { d.regulatoryClass = rc[1]; d.classLabel = CLASS[rc[1]]; }
    const jm = head.match(/JMDN\s*コード[：:\s]*(\d{8})/);
    if (jm) d.jmdn = jm[1];
    const cat = head.match(/(機械器具\s*\d+\s*[^\s　]+|プログラム\s*\d+\s*[^\s　]+)/);
    if (cat) d.category = cat[1].replace(/\s+/g, ' ');
    if (/特定保守管理医療機器/.test(head)) d.specialMaintenance = true;
  }
  // 添付文書の字が読めないときは、PMDA の URL の番号の形で承認・認証・届出を見分ける
  // 承認 30200BZX00271000／認証 304AGBZX00095000（年の後に英字2つ）／届出 13B1X10195000001
  // 番号は PDF の読み取り（途中で切れることがある）より、行を選んだ URL の番号を使う
  if (num) {
    const k = /^\d{3}[A-Z]{2}BZ[A-Z]\w+$/.test(num) ? '認証' : /^\d{5}BZ[A-Z]\w+$/.test(num) ? '承認' : /^\d{2}B\d/.test(num) ? '届出' : undefined;
    d.kind ??= k;
    if (d.kind) d.number = num;
  }
  return d;
}

let done = 0, failed = 0;
const revised = [];
for (const s of services) {
  if (done + failed >= limit) break;
  if (s.device && !all) continue;
  const url = s.device?.pmdaUrl ?? (s.sources ?? []).find((u) => /pmda\.go\.jp\/PmdaSearch\/kikiDetail\/GeneralList\//.test(u));
  if (!url) continue;
  try {
    const d = readDevice(url);
    if (d.kind || d.genericName) {
      // 添付文書の改訂（最新の版の日付が変わった）を拾って、更新履歴に出す
      if (s.device?.insertDate && d.insertDate && d.insertDate > s.device.insertDate) revised.push(s);
      s.device = { ...d, checkedAt: today };
      done++;
    } else failed++;
  } catch { failed++; }
  sleep(700);
  if (done % 25 === 0) fs.writeFileSync(F, JSON.stringify(services, null, 2) + '\n');
}
fs.writeFileSync(F, JSON.stringify(services, null, 2) + '\n');
if (revised.length) {
  addUpdate({
    date: todayJst(), kind: '事業', key: 'pmda-revision', href: `/services/${revised[0].id}/`,
    title: `医療機器の添付文書の改訂 ${revised.length}件`,
    body: 'PMDA の医療機器の添付文書検索で、新しい版が出た製品の情報を取り直しました。',
    links: revised.slice(0, 12).map((s) => ({ label: s.name.replace(/（.*?）/g, '').slice(0, 24), href: `/services/${s.id}/` })),
  });
}
console.error(`医療機器の情報を入れた ${done} 件 / 取れなかった ${failed} 件 / 添付文書の改訂 ${revised.length} 件`);
