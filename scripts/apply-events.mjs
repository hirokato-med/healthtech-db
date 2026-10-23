#!/usr/bin/env node
/**
 * 調べ直した「出来事」（M&A・提携・資金調達・サービス開始/終了など）を企業DBと提携マップに取り込む。
 *
 *   node scripts/apply-events.mjs events-a.json events-b.json [--dry]
 *
 * 入力（JSON 配列）: { date, type, actors, companyIds, summary, amount, service, verified, sources }
 * - 一次情報で確かめられたもの（verified かつ sources あり）だけを使う。
 * - 同じ出来事（年月・種類・登場する会社が同じ）は1件にまとめる。
 * - DB にある会社には、近況（history）に出典つきで足す。似た近況がすでにあれば足さない。
 * - 2社以上が出てくる買収・合併・出資・提携は、提携マップ（data/partnerships.json）にも線として足す。
 * - DB に無い会社で出来事が多いものは、企業追加の候補として最後に表示する。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (f) => path.join(ROOT, 'data', f);
const load = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const files = args.filter((a) => !a.startsWith('--'));

const companies = load(P('companies.json'));
const partnerships = load(P('partnerships.json'));
const byId = new Map(companies.map((c) => [c.id, c]));
const norm = (s = '') => s.normalize('NFKC').replace(/株式会社|合同会社|有限会社|ホールディングス|\s/g, '').toLowerCase();

// 会社のカテゴリから提携マップの領域を決める
const AREA = {
  'mental-health': '精神・神経', sleep: '睡眠', femtech: '女性の健康', nursing: '介護・高齢者', 'home-visit-nursing': '介護・高齢者',
  cro: '治験・研究', 'clinical-trial-support': '治験・研究', pharma: '治験・研究', 'real-world-data': '医療DX・データ', 'medical-data-analytics': '医療DX・データ',
  'medical-dx': '医療DX・データ', 'electronic-health-record': '医療DX・データ', 'medical-saas': '医療DX・データ', 'pharmacy-dx': '医療DX・データ', telemedicine: '医療DX・データ',
  'personal-health-record': '生活習慣・予防', 'health-corporate-management': '生活習慣・予防', 'disease-management-program': '生活習慣・予防', fitness: '生活習慣・予防', 'health-consulting': '生活習慣・予防',
};
const areaOf = (ids) => {
  for (const id of ids) for (const k of byId.get(id)?.categories ?? []) if (AREA[k]) return AREA[k];
  return 'その他';
};
const EDGE = {
  'M&A': ['parent', '買収・子会社化'], 合併: ['parent', '買収・子会社化'],
  資本業務提携: ['investment', '資本業務提携'], 出資: ['investment', '出資'], 業務提携: ['partnership', '業務提携'],
};

// 1. 読み込み・確かめられたものだけ・重複除去
const seen = new Map();
let raw = 0;
for (const f of files) {
  for (const e of load(f)) {
    raw++;
    if (!e.verified || !e.sources?.length || !e.date || !e.summary) continue;
    const who = [...(e.actors ?? [])].map(norm).sort().join('+');
    const k = `${e.date.slice(0, 7)}|${e.type}|${who}`;
    const prev = seen.get(k);
    if (prev) prev.sources = [...new Set([...prev.sources, ...e.sources])];
    else seen.set(k, { ...e, sources: [...e.sources], companyIds: (e.companyIds ?? []).filter((id) => byId.has(id)) });
  }
}
const events = [...seen.values()].sort((a, b) => a.date.localeCompare(b.date));

// 2. 近況に足す
const similar = (a, b) => {
  const x = new Set(norm(a)), y = norm(b);
  let hit = 0;
  for (const ch of y) if (x.has(ch)) hit++;
  return hit / Math.max(1, y.length) > 0.7;
};
let hist = 0;
for (const e of events) {
  for (const id of e.companyIds) {
    const c = byId.get(id);
    c.history ??= [];
    if (c.history.some((h) => h.date?.slice(0, 7) === e.date.slice(0, 7) && similar(h.text, e.summary))) continue;
    c.history.push({ date: e.date, text: e.summary + (e.amount ? `（${e.amount}）` : ''), source: e.sources[0] });
    c.history.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
    hist++;
  }
}

// 3. 提携マップに足す
const pkey = (p) => `${norm(p.from)}|${norm(p.to)}|${p.type}`;
const pk = new Set(partnerships.map(pkey));
let edges = 0;
for (const e of events) {
  const [type, kind] = EDGE[e.type] ?? [];
  if (!type || (e.actors ?? []).length < 2) continue;
  const name = (n) => companies.find((c) => norm(c.name) === norm(n))?.name ?? n;
  const p = {
    from: name(e.actors[0]), to: name(e.actors[1]), type, kind,
    label: (e.service ? `${e.service}で` : '') + kind,
    area: areaOf(e.companyIds), date: e.date, status: '継続', note: e.summary + (e.amount ? `（${e.amount}）` : ''), sources: e.sources,
  };
  if (pk.has(pkey(p))) continue;
  pk.add(pkey(p));
  partnerships.push(p);
  edges++;
}

// 4. DB に無い会社で、出来事が多いもの
const outside = {};
for (const e of events) for (const a of e.actors ?? []) if (!companies.some((c) => norm(c.name) === norm(a) || (c.aliases ?? []).some((x) => norm(x) === norm(a)))) outside[a] = (outside[a] ?? 0) + 1;
const cand = Object.entries(outside).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);

if (!dry) {
  fs.writeFileSync(P('companies.json'), JSON.stringify(companies, null, 2) + '\n');
  fs.writeFileSync(P('partnerships.json'), JSON.stringify(partnerships, null, 1) + '\n');
}
console.error(`出来事 ${raw} 件 → 確かめられた・重複なし ${events.length} 件`);
console.error(`近況に追加 ${hist} 件 / 提携マップに追加 ${edges} 件${dry ? '（--dry のため書き込みなし）' : ''}`);
if (cand.length) console.error('DB に無い会社（出来事2件以上）: ' + cand.map(([n, k]) => `${n}(${k})`).join('、'));
