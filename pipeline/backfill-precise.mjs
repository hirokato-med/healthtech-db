#!/usr/bin/env node
/**
 * すでに入っている決算（data/earnings.json）に、会社開示の前年同期比（changes）と
 * 添付の損益計算書の細かい数字（exact）を足す。TDnet に XBRL が残っているものだけ。
 *   node pipeline/backfill-precise.mjs [--force]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { changesFromPdfText, parseChanges, parsePL, plFileOf } from './lib/xbrl-precise.mjs';

const F = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'data', 'earnings.json');
const earnings = JSON.parse(fs.readFileSync(F, 'utf8'));
const force = process.argv.includes('--force');
let ok = 0, miss = 0;
// XBRL が残っていない決算は、決算短信 PDF の1ページ目から会社開示の増減率を読む（金額が DB と同じ組だけ）
let fromPdf = 0;
const pdfChanges = (r) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bfp-'));
  try {
    const f = path.join(tmp, 'a.pdf');
    execFileSync('curl', ['-s', '-f', '-L', '-A', 'Mozilla/5.0', '-o', f, r.pdf]);
    const t = execFileSync('pdftotext', ['-l', '1', '-layout', '-enc', 'UTF-8', f, '-'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8');
    return changesFromPdfText(t, r.current);
  } catch { return undefined; } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
};
for (const [id, e] of Object.entries(earnings)) for (const r of e.reports) {
  if (!r.changes && r.pdf && r.current && (force || !r.changesFromPdfTried)) {
    const ch = pdfChanges(r);
    r.changesFromPdfTried = true;
    if (ch) { r.changes = ch; r.changesSource = '決算短信PDF'; fromPdf++; }
  }
  if (!force && (r.exact || r.changes)) continue;
  const m = (r.pdf ?? '').match(/\/1401(\d+)\.pdf$/);
  if (!m) continue;
  const url = `https://www.release.tdnet.info/inbs/0812${m[1]}.zip`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bf-'));
  try {
    const zip = path.join(tmp, 'x.zip');
    execFileSync('curl', ['-s', '-f', '-A', 'Mozilla/5.0', '-o', zip, url]);
    const list = execFileSync('unzip', ['-Z1', zip]).toString().split('\n');
    const sum = list.find((n) => /XBRLData\/Summary\/.*-ixbrl\.htm$/.test(n));
    const read = (n) => execFileSync('unzip', ['-p', zip, n], { maxBuffer: 64 << 20 }).toString('utf8');
    const ch = sum ? parseChanges(read(sum)) : undefined;
    const pl = plFileOf(list);
    const ex = pl ? parsePL(read(pl)) : undefined;
    if (ch) r.changes = ch;
    if (ex) r.exact = ex;
    if (ch || ex) ok++; else miss++;
  } catch { miss++; } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
fs.writeFileSync(F, JSON.stringify(earnings, null, 1) + '\n');
console.error(`細かい数字を足した ${ok} 件／取れなかった ${miss} 件／決算短信 PDF から開示の増減率を読んだ ${fromPdf} 件`);
