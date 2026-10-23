import type { EarningsReport, Figures } from './types';

/** 百万円 → 「12.3億円」「850百万円」「1,234億円」 */
export const money = (v?: number) => {
  if (v == null) return '—';
  const a = Math.abs(v);
  const s = a >= 100 ? `${(a / 100).toLocaleString('ja-JP', { minimumFractionDigits: a >= 10000 ? 0 : 1, maximumFractionDigits: a >= 10000 ? 0 : 1 })}億円` : `${a.toLocaleString('ja-JP')}百万円`;
  return v < 0 ? `△${s}` : s;
};
/** 前年比（%）。前年が赤字・ゼロのときは出さない */
export const yoy = (cur?: number, prev?: number) => (cur == null || prev == null || prev <= 0 ? null : (cur / prev - 1) * 100);
export const margin = (f?: Figures) => (f?.revenue && f.operatingIncome != null ? (f.operatingIncome / f.revenue) * 100 : null);
export const pct = (v: number | null, sign = true) => (v == null ? '—' : `${sign && v > 0 ? '+' : ''}${v.toFixed(1)}%`);

/** 一覧に出す1社分のまとめ */
export type EarningsRow = {
  id: string;
  name: string;
  code: string;
  market: string;
  category: string;
  latest?: EarningsReport;
  fy?: EarningsReport;
};
/** 会社予想（四半期なら当期の通期予想、通期なら次期予想） */
export const forecastOf = (r?: EarningsReport) => (r ? (r.quarter === 'FY' ? r.nextForecast : r.forecast) : undefined);
export const forecastLabel = (r?: EarningsReport) => {
  if (!r) return '';
  if (r.quarter !== 'FY') return `${r.fiscalYear} 通期予想`;
  const m = r.fiscalYear.match(/(\d{4})年(\d{1,2})月期/);
  return m ? `${Number(m[1]) + 1}年${m[2]}月期 予想` : '次期予想';
};
