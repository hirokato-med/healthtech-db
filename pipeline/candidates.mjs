#!/usr/bin/env node
/**
 * ニュースから「企業DBに未収録の会社」を拾い、追加候補として data/candidates.json に貯める。
 *
 *   node pipeline/candidates.mjs
 *
 * - data/news.json のうち企業DBに紐付かなかったリリースを会社ごとにまとめる。
 * - 資金調達・上場・承認・提携などの「事業が動いた」リリースを出した会社ほど上に並べる。
 * - ここでは DB に入れない。編集部が確認して scripts/merge-companies.mjs で取り込む。
 * - status は「未確認」「確認中」「対象外」。編集部が付けた status は次回以降も残し、「対象外」は一番下に回す。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (f) => path.join(ROOT, 'data', f);
const news = JSON.parse(fs.readFileSync(P('news.json'), 'utf8'));
const prev = fs.existsSync(P('candidates.json')) ? JSON.parse(fs.readFileSync(P('candidates.json'), 'utf8')) : [];

const SIGNAL = /資金調達|シリーズ[A-EＡ-Ｅ]|プレシリーズ|シード|第三者割当|上場|IPO|承認|認証|薬事|提携|業務提携|資本提携|買収|子会社化|M&A|導入/;
// 業界団体・行政・海外拠点など、企業DBの対象でない発信元
const NOT_COMPANY = /医療法人|課$|会議$|協会|学会|機構|財団|大学|病院|NPO|特定非営利|ジャパン合同会社|JETRO|KPMG|翔泳社|医学書院/;

// 企業DBに入った会社は候補から外す（社名のゆらぎは株式会社・空白を落として比べる）
const norm = (s) => s.normalize('NFKC').replace(/株式会社|合同会社|\s/g, '').toLowerCase();
const inDb = new Set(JSON.parse(fs.readFileSync(P('companies.json'), 'utf8')).map((c) => norm(c.name)));
const skip = (name) => !name || NOT_COMPANY.test(name) || inDb.has(norm(name));

const byName = new Map(prev.filter((c) => !skip(c.company)).map((c) => [c.company, c]));
for (const n of news) {
  if (n.companyId || skip(n.company)) continue;
  const c = byName.get(n.company) ?? { company: n.company, signals: 0, items: [], firstSeen: n.publishedAt.slice(0, 10), status: '未確認' };
  if (c.items.some((x) => x.url === n.url)) continue;
  c.items.push({ title: n.title, url: n.url, date: n.publishedAt.slice(0, 10) });
  if (SIGNAL.test(n.title)) c.signals++;
  byName.set(n.company, c);
}
const out = [...byName.values()]
  .map((c) => ({ ...c, items: c.items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5) }))
  .sort((a, b) => Number(a.status === '対象外') - Number(b.status === '対象外') || b.signals - a.signals || b.items.length - a.items.length || b.items[0].date.localeCompare(a.items[0].date));
fs.writeFileSync(P('candidates.json'), JSON.stringify(out, null, 2) + '\n');
console.error(`candidates.json: ${out.length}社（うち資金調達・提携などのシグナルあり ${out.filter((c) => c.signals).length}社）`);
