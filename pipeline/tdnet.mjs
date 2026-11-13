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
import { addUpdate, todayJst } from './lib/updates.mjs';
import { parseChanges, parsePL, plFileOf } from './lib/xbrl-precise.mjs';

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
const newReports = [];
const newRevisions = [];
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
// 期間の月数（2025-02-01〜2025-08-31 → 7）
const monthsOf = (a, b) => { const [ya, ma] = a.split('-').map(Number); const [yb, mb] = b.split('-').map(Number); return (yb - ya) * 12 + (mb - ma) + 1; };
function parseSummary(html) {
  const facts = {};
  // 各期間（context）の始まりと終わり。前期が変則決算（例：7か月）なら前年比を出さないために使う
  const period = {};
  for (const m of html.matchAll(/<xbrli:context id="([^"]+)">([\s\S]*?)<\/xbrli:context>/g)) {
    const st = m[2].match(/<xbrli:startDate>([^<]+)/)?.[1], en = m[2].match(/<xbrli:endDate>([^<]+)/)?.[1];
    if (st && en) period[m[1].split('_')[0]] = monthsOf(st, en);
  }
  // 予想の要素が「値なし（xsi:nil）」で出ているか：会社が予想を開示していないときの印
  const nilForecast = /<ix:nonFraction[^>]*contextRef="(Current|Next)YearDuration[^"]*ForecastMember"[^>]*xsi:nil="true"[^>]*\/>/.test(html);
  // 値の無い要素（<ix:nonFraction ... xsi:nil="true"/>）は先に除く（残すと次の要素の値を飲み込む）
  html = html.replace(/<ix:nonFraction[^>]*\/>/g, '');
  const range = {};
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
    const scope = ctx.includes('NonConsolidatedMember') ? 'non' : 'con';
    // レンジの予想（下限・上限）は forecastRange / nextForecastRange に [下限, 上限] で持つ
    const lu = /LowerMember/.test(ctx) ? 0 : /UpperMember/.test(ctx) ? 1 : -1;
    const rwhen = /^CurrentYearDuration/.test(ctx) ? 'forecastRange' : /^NextYearDuration/.test(ctx) ? 'nextForecastRange' : null;
    if (lu >= 0) { if (rwhen) (((range[scope] ??= {})[rwhen] ??= {})[item] ??= [null, null])[lu] = Math.round(v / 1e6); continue; }
    if (!when) continue;
    if (!/ResultMember|ForecastMember/.test(ctx)) continue;
    ((facts[scope] ??= {})[when] ??= {})[item] = Math.round(v / 1e6); // 百万円
  }
  const key = facts.con || range.con ? 'con' : 'non';
  const f = { ...(facts[key] ?? {}), ...(range[key] ?? {}) };
  if (!Object.keys(f).length) return null;
  // 当期と前期の月数（四半期は累計の月数）。違えば前年比は出さない
  const cur = period.CurrentYearDuration && !Object.keys(period).some((k) => /^CurrentAccumulated/.test(k)) ? period.CurrentYearDuration : Object.entries(period).find(([k]) => /^CurrentAccumulated/.test(k))?.[1];
  const pri = Object.entries(period).find(([k]) => /^PriorAccumulated/.test(k))?.[1] ?? period.PriorYearDuration;
  const months = cur && pri ? { months: cur, priorMonths: pri } : {};
  // 予想が無いとき：要素はあるが値なし＝会社が開示していない／要素ごと無い＝取り込めなかった（区別して残す）
  const fc = f.forecast || f.nextForecast || f.forecastRange || f.nextForecastRange ? undefined : nilForecast ? 'not-disclosed' : 'not-captured';
  return { consolidated: key === 'con', ...f, ...months, ...(fc ? { forecastStatus: fc } : {}) };
}
// 売上の名前が「事業収益」「営業収益」などで XBRL のサマリーに売上が無いとき、決算短信の PDF の1ページ目から読む（百万円）
const REV_LABEL = /(売上高|売上収益|営業収益|事業収益|営業収入|経常収益)/;
function revenueFromPdf(pdf) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tdnet-pdf-'));
  try {
    const f = path.join(tmp, 'a.pdf');
    execFileSync('curl', ['-s', '-A', UA['User-Agent'], '-o', f, pdf]);
    const t = execFileSync('pdftotext', ['-l', '1', '-layout', '-enc', 'UTF-8', f, '-'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8');
    const lines = t.normalize('NFKC').split('\n');
    const head = lines.findIndex((l) => REV_LABEL.test(l));
    if (head < 0) return null;
    const label = lines[head].match(REV_LABEL)[1];
    // 行の最初の欄だけを読む。「－」は計上なし（'none'）。売上がマイナスはありえないので読み違いとして捨てる
    const num = (l) => {
      const tok = l.trim().split(/\s+/)[0] ?? '';
      if (/^[－―\-–]$/.test(tok)) return 'none';
      const m = tok.match(/^(△|▲)?([\d,]+(?:\.\d+)?)$/);
      if (!m || m[1]) return null;
      return Number(m[2].replace(/,/g, ''));
    };
    // 業績の表：見出しのすぐ下の「YYYY年M月期…」の行を当期・前期の順に
    const rows = lines.slice(head + 1, head + 8).filter((l) => /^\s*\d{4}年\s*\d{1,2}月期/.test(l)).map((l) => num(l.replace(/^\s*\d{4}年\s*\d{1,2}月期\S*/, '')));
    // 業績予想の表：2つめの見出しの下の「通期」の行
    const head2 = lines.findIndex((l, i) => i > head + 2 && REV_LABEL.test(l));
    const fl = head2 > 0 ? lines.slice(head2 + 1, head2 + 8).find((l) => /^\s*通期/.test(l)) : null;
    const forecast = fl ? num(fl.replace(/^\s*通期/, '')) : null;
    if (rows[0] == null) return null;
    const val = (v) => (typeof v === 'number' ? v : null);
    return { label, current: val(rows[0]), prior: val(rows[1]), forecast: val(forecast), absent: rows[0] === 'none' };
  } catch { return null; } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
// 業績予想の修正（tse-rvfc）：修正前（PreviousMember）と修正後（CurrentMember）の通期予想
function parseRevision(html) {
  html = html.replace(/<ix:nonFraction[^>]*\/>/g, '');
  const facts = {};
  for (const m of html.matchAll(/<ix:nonFraction([^>]*)>([\s\S]*?)<\/ix:nonFraction>/g)) {
    const a = m[1];
    const name = (a.match(/name="[^:"]+:([^"]+)"/) ?? [])[1];
    const ctx = (a.match(/contextRef="([^"]+)"/) ?? [])[1] ?? '';
    const raw = text(m[2]).replace(/,/g, '');
    if (!name || raw === '' || isNaN(Number(raw))) continue;
    if (!/^CurrentYearDuration/.test(ctx) || !ctx.includes('ForecastMember')) continue;
    const when = ctx.includes('PreviousMember') ? 'previous' : ctx.includes('CurrentMember') ? 'revised' : null;
    const item = ITEM.find(([, re]) => re.test(name))?.[0];
    if (!when || !item) continue;
    const scale = Number((a.match(/scale="(-?\d+)"/) ?? [])[1] ?? 0);
    const v = Number(raw) * 10 ** scale * (/sign="-"/.test(a) ? -1 : 1);
    const scope = ctx.includes('NonConsolidatedMember') ? 'non' : 'con';
    ((facts[scope] ??= {})[when] ??= {})[item] = Math.round(v / 1e6);
  }
  const f = facts.con ?? facts.non;
  return f?.revised ? { consolidated: !!facts.con, previous: f.previous, revised: f.revised } : null;
}
function parseXbrl(url, kind = 'summary') {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tdnet-'));
  try {
    const zip = path.join(tmp, 'x.zip');
    execFileSync('curl', ['-s', '-A', UA['User-Agent'], '-o', zip, url]);
    const list = execFileSync('unzip', ['-Z1', zip]).toString().split('\n');
    const sum = kind === 'revision' ? list.find((n) => /tse-rvfc-.*-ixbrl\.htm$/.test(n)) : list.find((n) => /XBRLData\/Summary\/.*-ixbrl\.htm$/.test(n));
    if (!sum) return null;
    const html = execFileSync('unzip', ['-p', zip, sum], { maxBuffer: 64 << 20 }).toString('utf8');
    if (kind === 'revision') return parseRevision(html);
    const x = parseSummary(html);
    if (!x) return null;
    // 比率の計算用：会社開示の前年同期比と、添付の損益計算書の細かい数字（丸めない）
    const changes = parseChanges(html);
    if (changes) x.changes = changes;
    const pl = plFileOf(list);
    if (pl) { const e = parsePL(execFileSync('unzip', ['-p', zip, pl], { maxBuffer: 64 << 20 }).toString('utf8')); if (e) x.exact = e; }
    return x;
  } catch {
    return null;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
const per0 = (t) => (/第[123]四半期|中間期/.test(t.normalize('NFKC')) ? 'Q' : 'FY');
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
      // 売上が XBRL に無い会社（事業収益など）は PDF から補う。補ったら何の名前だったかを残す
      if (x && x.current && x.current.revenue == null) {
        const pr = revenueFromPdf(r.pdf);
        if (pr?.absent) { x.revenueAbsent = true; x.revenueLabel = pr.label; }
        else if (pr && pr.current != null) {
          x.current.revenue = pr.current;
          if (pr.prior != null) (x.prior ??= {}).revenue = pr.prior;
          if (pr.forecast != null) (x[per0(r.title) === 'FY' ? 'nextForecast' : 'forecast'] ??= {}).revenue = pr.forecast;
          x.revenueLabel = pr.label;
        }
      }
      if (x) {
        const e = (earnings[c.id] ??= { code: c.securitiesCode, reports: [] });
        const per = periodOf(r.title);
        // 同じ決算期・四半期がすでにあれば足さない（決算短信から手で集めたセグメント付きの記録を残す）
        if (!e.reports.some((p) => p.pdf === r.pdf || (p.fiscalYear === per.fiscalYear && p.quarter === per.quarter))) {
          e.reports.push({ ...periodOf(r.title), date, title: r.title, ...x, pdf: r.pdf, source: 'TDnet XBRL' });
          e.reports.sort((a, b) => b.date.localeCompare(a.date));
          newReports.push({ id: c.id, name: c.name, label: periodOf(r.title).label });
          parsed++;
        }
      }
      await sleep(500);
    }
    // 業績予想の修正：修正前と修正後の通期予想を残す
    if (kind === '業績予想・配当' && r.xbrl && /業績予想|業績の修正/.test(r.title) && !/訂正/.test(r.title)) {
      const x = parseXbrl(r.xbrl, 'revision');
      if (x) {
        const e = (earnings[c.id] ??= { code: c.securitiesCode, reports: [] });
        e.revisions ??= [];
        if (!e.revisions.some((p) => p.pdf === r.pdf)) {
          const fy = (r.title.normalize('NFKC').match(/(\d{4})年(\d{1,2})月期/) ?? [])[0] ?? '';
          e.revisions.push({ date, title: r.title, ...(fy ? { fiscalYear: fy } : {}), ...x, pdf: r.pdf });
          e.revisions.sort((a, b) => b.date.localeCompare(a.date));
          newRevisions.push({ id: c.id, name: c.name, x });
        }
      }
      await sleep(500);
    }
  }
}
disclosures.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
fs.writeFileSync(P('disclosures.json'), JSON.stringify(disclosures, null, 1) + '\n');
fs.writeFileSync(P('earnings.json'), JSON.stringify(earnings, null, 1) + '\n');
// 新しく入った決算をトップの「データの更新」に載せる（同じ日の分は1件にまとめる）
if (newReports.length) {
  const short = (n) => n.replace(/^株式会社|株式会社$/g, '');
  addUpdate(
    { date: todayJst(), kind: '決算', key: 'tdnet-earnings', href: '/earnings/', body: '決算短信の数字（売上高・営業利益・会社予想）を TDnet から取り込みました。', links: newReports.map((x) => ({ label: `${short(x.name)}（${x.label ?? '決算'}）`, href: `/earnings/${x.id}/` })) },
    (links) => `決算 ${links.length}件を更新：${links.slice(0, 3).map((l) => l.label.replace(/（.*$/, '')).join('、')}${links.length > 3 ? ' ほか' : ''}`,
  );
}
if (newRevisions.length) {
  const short = (n) => n.replace(/^株式会社|株式会社$/g, '');
  const dir = (x) => { const a = x.previous?.operatingIncome, b = x.revised?.operatingIncome; return a == null || b == null ? '修正' : b > a ? '上方修正' : b < a ? '下方修正' : '修正'; };
  addUpdate(
    { date: todayJst(), kind: '決算', key: 'tdnet-revisions', href: '/earnings/', body: '会社が発表した通期の業績予想の修正（修正前と修正後）を TDnet から取り込みました。', links: newRevisions.map((v) => ({ label: `${short(v.name)}（${dir(v.x)}）`, href: `/earnings/${v.id}/#revisions` })) },
    (links) => `業績予想の修正 ${links.length}件：${links.slice(0, 3).map((l) => l.label).join('、')}${links.length > 3 ? ' ほか' : ''}`,
  );
}
console.error(`TDnet: 過去${days}日 / 対象 ${byCode.size} 社 / 新しい開示 ${added} 件 / 決算短信の数字 ${parsed} 件 / 業績予想の修正 ${newRevisions.length} 件`);
