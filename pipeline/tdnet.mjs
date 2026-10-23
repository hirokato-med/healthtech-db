#!/usr/bin/env node
/**
 * TDnet（適時開示情報閲覧サービス）から、企業DBの上場企業の適時開示を集める。
 * 決算短信は XBRL（サマリー）から売上高・営業利益・経常利益・純利益と通期予想を取り出し、data/earnings.json に入れる。
 *
 *   node pipeline/tdnet.mjs              # 今日と昨日
 *   node pipeline/tdnet.mjs --days 31    # 過去31日（TDnet で見られるのはおよそ1か月）
 *
 * - 対象は companies.json で securitiesCode のある会社（TDnet のコードは末尾に 0 が付く5桁）。
 * - 開示の一覧は data/disclosures.json（表題・日時・PDF の URL。本文は TDnet で確認する）。
 * - 金額は百万円。連結があれば連結、なければ個別。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (f) => path.join(ROOT, 'data', f);
const load = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
const BASE = 'https://www.release.tdnet.info/inbs/';
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; HealthtechDB/1.0)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const args = process.argv.slice(2);
const days = Number(args[args.indexOf('--days') + 1]) || (args.includes('--days') ? 31 : 2);

const companies = load(P('companies.json'), []);
const byCode = new Map(companies.filter((c) => c.securitiesCode).map((c) => [c.securitiesCode.toUpperCase() + '0', c]));
const disclosures = load(P('disclosures.json'), []);
const earnings = load(P('earnings.json'), {});
const seen = new Set(disclosures.map((d) => d.pdf));

const text = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).trim();
const kindOf = (t) =>
  /決算短信/.test(t) ? '決算短信' : /業績予想|業績の修正|配当予想/.test(t) ? '業績予想・配当' : /決算説明|説明資料|補足資料/.test(t) ? '決算説明資料' : /株式取得|子会社|合併|事業譲渡|資本業務提携|業務提携|公開買付/.test(t) ? 'M&A・提携' : 'その他';

async function listDay(ymd) {
  const rows = [];
  for (let p = 1; p < 30; p++) {
    const res = await fetch(`${BASE}I_list_${String(p).padStart(3, '0')}_${ymd}.html`, { headers: UA });
    if (!res.ok) break;
    const html = await res.text();
    const trs = [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => m[1]).filter((r) => r.includes('<td'));
    if (!trs.length) break;
    for (const r of trs) {
      const cells = [...r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => text(m[1]));
      const pdf = r.match(/href="([^"]+\.pdf)"/)?.[1];
      const zip = r.match(/href="([^"]+\.zip)"/)?.[1];
      if (cells.length >= 4 && pdf) rows.push({ time: cells[0], code: cells[1], name: cells[2], title: cells[3], pdf: BASE + pdf, xbrl: zip ? BASE + zip : undefined });
    }
    await sleep(400);
  }
  return rows;
}

// --- XBRL サマリーから数字を取り出す ---
const ITEM = [
  ['revenue', /^(NetSales|OperatingRevenues|OrdinaryRevenues|NetSalesIFRS|RevenueIFRS|SalesIFRS|OperatingRevenuesIFRS|NetSalesUS|RevenuesUS|OperatingRevenuesUS)$/],
  ['operatingIncome', /^(OperatingIncome|OperatingIncomeIFRS|OperatingProfitIFRS|OperatingIncomeUS)$/],
  ['ordinaryIncome', /^(OrdinaryIncome|ProfitBeforeTaxIFRS|IncomeBeforeIncomeTaxesUS)$/],
  ['netIncome', /^(ProfitAttributableToOwnersOfParent|ProfitAttributableToOwnersOfParentIFRS|NetIncome|NetIncomeAttributableToOwnersOfParentUS)$/],
];
function parseSummary(html) {
  const facts = {};
  // 値の無い要素（<ix:nonFraction ... xsi:nil="true"/>）は先に除く（残すと次の要素の値を飲み込む）
  html = html.replace(/<ix:nonFraction[^>]*\/>/g, '');
  for (const m of html.matchAll(/<ix:nonFraction([^>]*)>([\s\S]*?)<\/ix:nonFraction>/g)) {
    const a = m[1];
    const name = (a.match(/name="[^:"]+:([^"]+)"/) ?? [])[1];
    const ctx = (a.match(/contextRef="([^"]+)"/) ?? [])[1];
    const raw = text(m[2]).replace(/,/g, '');
    if (!name || !ctx || raw === '' || isNaN(Number(raw))) continue;
    const item = ITEM.find(([, re]) => re.test(name))?.[0];
    if (!item) continue;
    const scale = Number((a.match(/scale="(-?\d+)"/) ?? [])[1] ?? 0);
    const v = Number(raw) * 10 ** scale * (/sign="-"/.test(a) ? -1 : 1);
    const when = /^Current(Year|Accumulated\w+)Duration/.test(ctx) ? (ctx.includes('ForecastMember') ? 'forecast' : 'current')
      : /^Prior(Year|Accumulated\w+)Duration/.test(ctx) ? 'prior' : /^NextYearDuration/.test(ctx) && ctx.includes('ForecastMember') ? 'nextForecast' : null;
    if (!when || /LowerMember|UpperMember/.test(ctx)) continue;
    if (!/ResultMember|ForecastMember/.test(ctx)) continue;
    const scope = ctx.includes('NonConsolidatedMember') ? 'non' : 'con';
    ((facts[scope] ??= {})[when] ??= {})[item] = Math.round(v / 1e6); // 百万円
  }
  const f = facts.con ?? facts.non;
  return f ? { consolidated: !!facts.con, ...f } : null;
}
function parseXbrl(url) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tdnet-'));
  try {
    const zip = path.join(tmp, 'x.zip');
    execFileSync('curl', ['-s', '-A', UA['User-Agent'], '-o', zip, url]);
    const list = execFileSync('unzip', ['-Z1', zip]).toString().split('\n');
    const sum = list.find((n) => /XBRLData\/Summary\/.*-ixbrl\.htm$/.test(n));
    if (!sum) return null;
    return parseSummary(execFileSync('unzip', ['-p', zip, sum], { maxBuffer: 64 << 20 }).toString('utf8'));
  } catch {
    return null;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
const periodOf = (t) => {
  const t2 = t.normalize('NFKC');
  const fy = (t2.match(/(\d{4})年(\d{1,2})月期/) ?? [])[0] ?? '';
  const q = /第1四半期/.test(t2) ? 'Q1' : /第2四半期|中間期/.test(t2) ? 'Q2' : /第3四半期/.test(t2) ? 'Q3' : 'FY';
  return { fiscalYear: fy, quarter: q, label: fy + (q === 'FY' ? ' 通期' : q === 'Q2' ? ' 第2四半期（中間期）' : ` 第${q[1]}四半期`) };
};

const today = new Date(Date.now() + 9 * 3600e3); // 日本時間
let added = 0, parsed = 0;
for (let i = 0; i < days; i++) {
  const d = new Date(today.getTime() - i * 864e5);
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rows = await listDay(ymd);
  for (const r of rows) {
    const c = byCode.get(r.code.toUpperCase());
    if (!c || seen.has(r.pdf)) continue;
    seen.add(r.pdf);
    const date = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6)}`;
    const kind = kindOf(r.title);
    disclosures.push({ date, time: r.time, companyId: c.id, company: c.name, code: c.securitiesCode, title: r.title, kind, pdf: r.pdf, ...(r.xbrl ? { xbrl: r.xbrl } : {}) });
    added++;
    if (kind === '決算短信' && r.xbrl && !/訂正/.test(r.title)) {
      const x = parseXbrl(r.xbrl);
      if (x) {
        const e = (earnings[c.id] ??= { code: c.securitiesCode, reports: [] });
        if (!e.reports.some((p) => p.pdf === r.pdf)) {
          e.reports.push({ ...periodOf(r.title), date, title: r.title, ...x, pdf: r.pdf, source: 'TDnet XBRL' });
          e.reports.sort((a, b) => b.date.localeCompare(a.date));
          parsed++;
        }
      }
      await sleep(500);
    }
  }
}
disclosures.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
fs.writeFileSync(P('disclosures.json'), JSON.stringify(disclosures, null, 1) + '\n');
fs.writeFileSync(P('earnings.json'), JSON.stringify(earnings, null, 1) + '\n');
console.error(`TDnet: 過去${days}日 / 対象 ${byCode.size} 社 / 新しい開示 ${added} 件 / 決算短信の数字 ${parsed} 件`);
