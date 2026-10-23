import type { EarningsReport, Figures } from './types';

/** 百万円 → 「12.3億円」「850百万円」「1,234億円」 */
export const money = (v?: number) => {
  if (v == null) return '—';
  const a = Math.abs(v);
  const oku = Math.round(a / 100);
  const s = a >= 1e6
    ? `${Math.floor(oku / 10000)}兆${oku % 10000 ? `${(oku % 10000).toLocaleString('ja-JP')}億` : ''}円`
    : a >= 100 ? `${(a / 100).toLocaleString('ja-JP', { minimumFractionDigits: a >= 10000 ? 0 : 1, maximumFractionDigits: a >= 10000 ? 0 : 1 })}億円` : `${a.toLocaleString('ja-JP')}百万円`;
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

/** 前年同期と比べた変化のことば（黒字転換・赤字縮小なども） */
export const change = (cur?: number, prev?: number): { text: string; tone: 'up' | 'down' | '' } => {
  if (cur == null || prev == null) return { text: '—', tone: '' };
  if (prev > 0 && cur > 0) {
    const r = (cur / prev - 1) * 100;
    return Math.abs(r) < 0.05 ? { text: '横ばい', tone: '' } : { text: `${r > 0 ? '+' : ''}${r.toFixed(1)}%`, tone: r > 0 ? 'up' : 'down' };
  }
  if (prev <= 0 && cur > 0) return { text: '黒字転換', tone: 'up' };
  if (prev > 0 && cur <= 0) return { text: '赤字転落', tone: 'down' };
  return cur > prev ? { text: '赤字縮小', tone: 'up' } : cur < prev ? { text: '赤字拡大', tone: 'down' } : { text: '横ばい', tone: '' };
};
/** 「2026年8月期」と四半期から対象期間（「2025年9月〜2026年8月」） */
export const periodRange = (fiscalYear: string, quarter: string) => {
  const m = fiscalYear.match(/(\d{4})年(\d{1,2})月期/);
  if (!m) return '';
  const endY = Number(m[1]), endM = Number(m[2]);
  const startY = endM === 12 ? endY : endY - 1, startM = endM === 12 ? 1 : endM + 1;
  const months = quarter === 'Q1' ? 3 : quarter === 'Q2' ? 6 : quarter === 'Q3' ? 9 : 12;
  const t = startY * 12 + (startM - 1) + months - 1;
  return `${startY}年${startM}月〜${Math.floor(t / 12)}年${(t % 12) + 1}月`;
};
