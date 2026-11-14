#!/usr/bin/env node
/**
 * 同じ事業が2件に分かれているものを1件にまとめる（残す方に、消す方の節目・出典・公式サイトを足す）。
 *   node scripts/merge-services.mjs 残すid 消すid [--name 新しい名前]
 * 消した id は data/service-redirects.json に「消したid → 残したid」で残す。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const D = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'data');
const F = path.join(D, 'services.json');
const R = path.join(D, 'service-redirects.json');
const [keepId, dropId] = process.argv.slice(2);
const nameArg = process.argv.includes('--name') ? process.argv[process.argv.indexOf('--name') + 1] : undefined;
const list = JSON.parse(fs.readFileSync(F, 'utf8'));
const keep = list.find((s) => s.id === keepId), drop = list.find((s) => s.id === dropId);
if (!keep || !drop) throw new Error('id が見つからない');
const key = (m) => `${(m.date ?? '').slice(0, 7)}|${m.text.slice(0, 18)}`;
const have = new Set((keep.milestones ?? []).map(key));
keep.milestones = [...(keep.milestones ?? []), ...(drop.milestones ?? []).filter((m) => m.date && !have.has(key(m)) && !(keep.milestones ?? []).some((k) => k.date?.slice(0, 7) === m.date.slice(0, 7) && k.text.slice(0, 10) === m.text.slice(0, 10)))].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
keep.sources = [...new Set([...(keep.sources ?? []), ...(drop.sources ?? [])])];
if (!keep.hp && drop.hp) keep.hp = drop.hp;
if (!keep.startedAt && drop.startedAt) keep.startedAt = drop.startedAt;
if (nameArg) keep.name = nameArg;
keep.updatedAt = new Date().toISOString().slice(0, 7);
const out = list.filter((s) => s.id !== dropId);
fs.writeFileSync(F, JSON.stringify(out, null, 2) + '\n');
const redirects = fs.existsSync(R) ? JSON.parse(fs.readFileSync(R, 'utf8')) : {};
redirects[dropId] = keepId;
fs.writeFileSync(R, JSON.stringify(redirects, null, 1) + '\n');
console.error(`${drop.name} を ${keep.name} にまとめた（節目 ${keep.milestones.length}・出典 ${keep.sources.length}）`);
