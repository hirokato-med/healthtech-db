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
import { parseChanges, parsePL, plFileOf } from './lib/xbrl-precise.mjs';

const F = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'data', 'earnings.json');
const earnings = JSON.parse(fs.readFileSync(F, 'utf8'));
const force = process.argv.includes('--force');
let ok = 0, miss = 0;
for (const [id, e] of Object.entries(earnings)) for (const r of e.reports) {
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
console.error(`細かい数字を足した ${ok} 件／取れなかった ${miss} 件`);
