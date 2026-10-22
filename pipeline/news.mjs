#!/usr/bin/env node
/**
 * PR TIMES のキーワード検索から、ヘルスケア関連のプレスリリースを拾って data/news.json に追記する。
 *
 *   node pipeline/news.mjs                 # 既定: 医療 ヘルスケア ヘルステック
 *   node pipeline/news.mjs 医療DX 遠隔医療
 *
 * - 同じ URL は上書き（二重登録なし）、新しい順に最大 400 件を保持する。
 * - 社名が企業DB（data/companies.json）に一致すれば companyId を付ける（企業ページの「関連ニュース」に出る）。
 * - カテゴリはタイトルのキーワードから推定する（外れたら手で直してよい）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchText } from './lib/fetch-text.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'data', 'news.json');
const words = process.argv.slice(2).length ? process.argv.slice(2) : ['医療', 'ヘルスケア', 'ヘルステック'];
const companies = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'companies.json'), 'utf8'));
const existing = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : [];
const byUrl = new Map(existing.map((n) => [n.url, n]));

const CATEGORY_RULES = [
  ['telemedicine', /オンライン診療|遠隔診療|遠隔医療/],
  ['pharmacy-dx', /薬局|服薬指導|調剤/],
  ['electronic-health-record', /電子カルテ/],
  ['medical-image', /画像診断|読影|CT|MRI|内視鏡/],
  ['medical-device', /医療機器|薬事承認|製造販売承認|SaMD|プログラム医療機器/],
  ['personal-health-record', /PHR|健康記録|ヘルスケアアプリ|ウェアラブル/],
  ['mental-health', /メンタル|うつ|ストレス/],
  ['femtech', /フェムテック|月経|妊活|不妊|更年期/],
  ['dental', /歯科|歯医者|矯正/],
  ['nursing', /介護|ケアマネ|訪問看護/],
  ['home-medical', /在宅医療|訪問診療/],
  ['health-corporate-management', /健康経営|従業員の健康|産業医/],
  ['recruting-solutions', /求人|転職|採用|人材/],
  ['clinical-trial-support', /治験|臨床試験/],
  ['real-world-data', /リアルワールドデータ|レセプト|医療ビッグデータ|医療データ/],
  ['medical-dx', /病院|クリニック|医療機関|診療所|医療DX/],
  ['simple-inspection', /検査キット|郵送検査|セルフチェック/],
  ['direct-to-consumer', /D2C|サプリ|定期便/],
  ['pharma', /製薬|創薬|新薬|承認取得/],
];
const guessCategory = (title) => CATEGORY_RULES.find(([, re]) => re.test(title))?.[0] ?? null;

const normalize = (s) =>
  s
    .toLowerCase()
    .replace(/株式会社|有限会社|合同会社|（株）|\(株\)|inc\.?|co\.,? ?ltd\.?|corporation|k\.k\./g, '')
    .replace(/[\s　・,.、。()（）「」]/g, '')
    .trim();
const index = companies.map((c) => [normalize(c.name), c.id]);
const matchCompany = (name) => {
  const n = normalize(name);
  if (!n) return null;
  return index.find(([cn]) => cn === n)?.[1] ?? index.find(([cn]) => cn.length >= 4 && n.length >= 4 && (cn.includes(n) || n.includes(cn)))?.[1] ?? null;
};

/** 「3時間前」「2026年10月21日 12時00分」などを ISO にする */
const toIso = (when, now = new Date()) => {
  const rel = when.match(/(\d+)(分|時間|日)前/);
  if (rel) {
    const n = Number(rel[1]);
    const ms = rel[2] === '分' ? n * 60e3 : rel[2] === '時間' ? n * 3600e3 : n * 86400e3;
    return new Date(now.getTime() - ms).toISOString();
  }
  const abs = when.match(/(\d{4})年(\d{1,2})月(\d{1,2})日(?:\s*(\d{1,2})時(\d{1,2})分)?/);
  if (abs) {
    const [, y, m, d, hh = '9', mm = '0'] = abs;
    return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:00+09:00`).toISOString();
  }
  if (!Number.isNaN(Date.parse(when))) return new Date(when).toISOString();
  return now.toISOString();
};
const clampFuture = (iso, now = new Date()) => (new Date(iso) > now ? now.toISOString() : iso);

let added = 0;
for (const word of words) {
  const url = `https://prtimes.jp/main/action.php?run=html&page=searchkey&search_word=${encodeURIComponent(word)}`;
  let html;
  try {
    html = await fetchText(url);
  } catch (e) {
    console.error(`${word}: 取得に失敗しました (${e.message})`);
    continue;
  }
  for (const m of html.matchAll(/<a[^>]+href="(?:https:\/\/prtimes\.jp)?(\/main\/html\/rd\/p\/\d+\.\d+\.html)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const href = `https://prtimes.jp${m[1]}`;
    const raw = strip(m[2]);
    const timeTail = raw.match(/\s*(\d+(?:分|時間|日)前|\d{4}年\d{1,2}月\d{1,2}日(?:\s*\d{1,2}時\d{1,2}分)?)$/);
    const title = timeTail ? raw.slice(0, timeTail.index).trim() : raw;
    if (!title || title.length < 8) continue;
    const tail = html.slice(m.index + m[0].length, m.index + m[0].length + 800);
    const company = strip(tail.match(/<a[^>]+href="\/main\/html\/searchrlp\/company_id\/\d+"[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? '');
    const when =
      timeTail?.[1] ??
      strip(tail.match(/<time[^>]*datetime="([^"]+)"/i)?.[1] ?? tail.match(/(\d+(?:分|時間|日)前|\d{4}年\d{1,2}月\d{1,2}日(?:\s*\d{1,2}時\d{1,2}分)?)/)?.[1] ?? '');
    const prev = byUrl.get(href);
    const item = {
      id: href.match(/p\/(\d+\.\d+)\.html/)?.[1] ?? href,
      title: prev && prev.title.length > title.length ? prev.title : title,
      url: href,
      company: company || prev?.company || '',
      companyId: matchCompany(company || prev?.company || ''),
      publishedAt: clampFuture(prev?.publishedAt ?? toIso(when)),
      category: prev?.category ?? guessCategory(title),
      source: 'prtimes',
    };
    if (!prev) added++;
    byUrl.set(href, item);
  }
}

// 一覧ではタイトルが「…」で省略されるので、新規分はリリースページの og:title / 公開日時で補完する
const meta = (html, name) =>
  html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1] ??
  html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, 'i'))?.[1] ??
  null;
const needFix = [...byUrl.values()].filter((n) => !n.enriched);
let i = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (i < needFix.length) {
      const n = needFix[i++];
      try {
        const html = await fetchText(n.url, { maxTime: 20 });
        const t = meta(html, 'og:title');
        if (t) n.title = strip(t).replace(/\s*[|｜]\s*.*?プレスリリース.*$/, '').trim() || n.title;
        const pub = meta(html, 'article:published_time') ?? html.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1];
        if (pub && !Number.isNaN(Date.parse(pub))) n.publishedAt = new Date(pub).toISOString();
        const co = meta(html, 'article:author');
        if (co && !n.company) { n.company = strip(co); n.companyId = matchCompany(n.company); }
        n.category ??= guessCategory(n.title);
      } catch (e) {
        console.error(`補完失敗 ${n.url}: ${e.message}`);
      }
      n.enriched = true;
    }
  }),
);
const items = [...byUrl.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 400);
fs.writeFileSync(FILE, JSON.stringify(items, null, 2) + '\n');
console.error(`news.json: ${items.length}件（新規 ${added}件）`);

function strip(s) {
  return s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}
