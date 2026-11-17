#!/usr/bin/env node
/**
 * 決算短信から集めた決算の数字を data/earnings.json に取り込む（TDnet の XBRL で取れない過去の期を埋める）。
 *
 *   node scripts/merge-earnings.mjs out-a.json out-b.json
 *
 * 入力（JSON 配列）: { id, reports: [{ fiscalYear, quarter, label, date, title, consolidated, current, prior, forecast, nextForecast, segments, segmentProfitLabel, pdf, source, note }] }
 * - 同じ決算期・四半期がすでにあれば足さない（TDnet の XBRL から取ったものを優先）。
 *
 *   node scripts/merge-earnings.mjs --segments seg-out-1.json ...
 * 入力: { id, fiscalYear, quarter, segments, segmentProfitLabel }
 * - TDnet から取り込んだ決算（セグメントが無い）に、決算短信から集めたセグメント別の数字を足す。
 * - ヘルスケアの判定は scripts/add-major.mjs の HC と同じ基準（会社全体がヘルスケアの会社以外は、名前にヘルスケア等の無い区分を外す）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const F = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'earnings.json');
const earnings = JSON.parse(fs.readFileSync(F, 'utf8'));
const companies = JSON.parse(fs.readFileSync(path.join(path.dirname(F), 'companies.json'), 'utf8'));
const codeOf = Object.fromEntries(companies.map((c) => [c.id, c.securitiesCode]));
const clean = (o) => (o && Object.keys(o).length ? Object.fromEntries(Object.entries(o).filter(([, v]) => typeof v === 'number')) : undefined);
const segs = (a) => (Array.isArray(a) && a.length ? a.filter((x) => x?.name).map((x) => Object.fromEntries(Object.entries({ name: x.name, revenue: x.revenue, profit: x.profit, priorRevenue: x.priorRevenue, priorProfit: x.priorProfit, healthcare: x.healthcare || undefined }).filter(([, v]) => v !== undefined && v !== null))) : undefined);
let added = 0, skipped = 0;
// ヘルスケアに関わるセグメントの名前（scripts/add-major.mjs の HC と同じ）
const HC = /ヘルスケア|医療|医薬|メディカル|介護|ライフサイエンス|薬|調剤|ニュートラシューティカルズ|ヘルスサイエンス|DSB/;
if (process.argv[2] === '--segments') {
  const byId = new Map(companies.map((c) => [c.id, c]));
  let filled = 0, none = 0;
  for (const f of process.argv.slice(3)) for (const x of JSON.parse(fs.readFileSync(f, 'utf8'))) {
    const r = earnings[x.id]?.reports.find((p) => p.fiscalYear === x.fiscalYear && p.quarter === x.quarter);
    const s = segs(x.segments);
    if (!r || !s?.length) { none++; continue; }
    const whole = (byId.get(x.id)?.healthcareSegments ?? []).includes('全社');
    for (const g of s) if (g.healthcare && !whole && !HC.test(g.name)) delete g.healthcare;
    if (!r.segments?.length) { r.segments = s; if (x.segmentProfitLabel) r.segmentProfitLabel = x.segmentProfitLabel; filled++; }
  }
  fs.writeFileSync(F, JSON.stringify(earnings, null, 1) + '\n');
  console.error(`セグメントを足した決算 ${filled} 期 / 取れなかった・該当なし ${none} 件`);
  process.exit(0);
}
for (const f of process.argv.slice(2)) {
  for (const x of JSON.parse(fs.readFileSync(f, 'utf8'))) {
    if (!codeOf[x.id]) continue;
    const e = (earnings[x.id] ??= { code: codeOf[x.id], reports: [] });
    for (const r of x.reports ?? []) {
      if (!r.fiscalYear || !r.quarter || !r.date || !r.current) continue;
      if (e.reports.some((p) => p.fiscalYear === r.fiscalYear && p.quarter === r.quarter)) { skipped++; continue; }
      const rec = { fiscalYear: r.fiscalYear, quarter: r.quarter, label: r.label, date: r.date, title: r.title ?? r.label, consolidated: r.consolidated ?? true, current: clean(r.current), prior: clean(r.prior), forecast: clean(r.forecast), nextForecast: clean(r.nextForecast), segments: segs(r.segments), segmentProfitLabel: r.segmentProfitLabel || undefined, pdf: r.pdf, source: r.source ?? '決算短信', ...(r.note ? { note: r.note } : {}) };
      e.reports.push(Object.fromEntries(Object.entries(rec).filter(([, v]) => v !== undefined)));
      added++;
    }
    e.reports.sort((a, b) => b.date.localeCompare(a.date));
  }
}
fs.writeFileSync(F, JSON.stringify(earnings, null, 1) + '\n');
console.error(`決算 追加 ${added} 期 / 既にあり ${skipped} 期 → ${Object.keys(earnings).length} 社`);
