import type { EarningsReport, Figures, Segment } from './types';

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
  /** 大手企業か */
  major?: boolean;
};

/** ヘルスケアに関わるセグメントの合計と、全セグメントの売上に占める割合 */
export const healthcareOf = (r?: EarningsReport) => {
  const segs = r?.segments ?? [];
  const hc = segs.filter((s) => s.healthcare);
  if (!hc.length) return undefined;
  const sum = (xs: Segment[], k: keyof Segment) => (xs.every((x) => typeof x[k] === 'number') ? xs.reduce((a, x) => a + (x[k] as number), 0) : undefined);
  const revenue = sum(hc, 'revenue'), all = sum(segs, 'revenue');
  return {
    names: hc.map((s) => s.name),
    revenue,
    profit: sum(hc, 'profit'),
    priorRevenue: sum(hc, 'priorRevenue'),
    priorProfit: sum(hc, 'priorProfit'),
    share: revenue != null && all ? (revenue / all) * 100 : null,
    whole: hc.length === segs.length,
  };
};
/** セグメントがある直近の決算 */
export const latestWithSegments = (reports: EarningsReport[]) => reports.find((r) => r.segments?.length);
/** 会社予想（四半期なら当期の通期予想、通期なら次期予想） */
export const forecastOf = (r?: EarningsReport) => (r ? (r.quarter === 'FY' ? r.nextForecast : r.forecast) : undefined);
/** レンジで開示された予想（四半期なら当期、通期なら次期） */
export const forecastRangeOf = (r?: EarningsReport) => (r ? (r.quarter === 'FY' ? r.nextForecastRange : r.forecastRange) : undefined);
/** 予想の1項目を文字にする：単一の値／レンジ（下限〜上限）／無ければ null */
export const forecastText = (r: EarningsReport | undefined, k: keyof Figures) => {
  const v = forecastOf(r)?.[k];
  if (v != null) return money(v);
  const rg = forecastRangeOf(r)?.[k];
  if (rg && (rg[0] != null || rg[1] != null)) return `${money(rg[0] ?? undefined)}〜${money(rg[1] ?? undefined)}`;
  return null;
};
/** 予想があるか（単一でもレンジでも） */
export const hasForecast = (r?: EarningsReport) => !!(forecastOf(r) || forecastRangeOf(r));
/** 予想が無いときの説明：会社が出していないのか、取り込めなかったのかを分ける */
export const noForecastText = (r?: EarningsReport) => (r?.forecastStatus === 'not-disclosed' ? '予想は非開示' : '予想は未取得');
/** 前年と比べてよいか：期間の長さが違う（変則決算）・決算期変更のときは比べない */
export const comparable = (r?: EarningsReport) => !!r && r.comparable !== false && !(r.months && r.priorMonths && r.months !== r.priorMonths);
/** 比べられないときの短い理由 */
export const notComparableText = (r?: EarningsReport) => (r?.months && r?.priorMonths && r.months !== r.priorMonths ? `前期は${r.priorMonths}か月のため比較なし` : '期間が違うため比較なし');
/** 前年比（比べられないときは null） */
/**
 * 前年同期比（%）。会社が開示した値 → 添付の損益計算書の細かい数字 → サマリーの数字（百万円）の順に使う。
 * 百万円に丸めた数字から計算すると、小さい会社ほど開示値とずれる（サスメド 227÷45 → +404% だが開示は +396.9%）。
 */
export const growth = (r?: EarningsReport, k: keyof Figures = 'revenue') => {
  if (!comparable(r)) return null;
  const c = r?.changes?.[k as keyof NonNullable<EarningsReport['changes']>];
  if (c != null) return c;
  const ex = r?.exact;
  const ek = k as keyof NonNullable<NonNullable<EarningsReport['exact']>['current']>;
  if (ex?.current?.[ek] != null && ex?.prior?.[ek] != null) return yoy(ex.current[ek], ex.prior[ek]);
  return yoy(r?.current?.[k], r?.prior?.[k]);
};
/** 営業利益率（%）。添付の損益計算書の細かい数字があればそれで計算する */
export const marginOf = (r?: EarningsReport) => {
  const e = r?.exact?.current;
  if (e?.revenue && e.operatingIncome != null) return (e.operatingIncome / e.revenue) * 100;
  return margin(r?.current);
};
/** 売上の表示：値／計上なし／未取得 */
export const revenueText = (r?: EarningsReport) => (r?.current?.revenue != null ? money(r.current.revenue) : r?.revenueAbsent ? '計上なし' : '—');
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
/** 決算1件の項目ごとの前年同期比の表示。黒字どうしは growth（開示値・細かい数字）、赤字を含むときは細かい数字で縮小・拡大を判定 */
export const changeOf = (r: EarningsReport, k: keyof Figures): { text: string; tone: 'up' | 'down' | '' } => {
  const ek = k as keyof NonNullable<NonNullable<EarningsReport['exact']>['current']>;
  const cur = r.exact?.current?.[ek] ?? r.current?.[k];
  const prev = r.exact?.prior?.[ek] ?? r.prior?.[k];
  if (cur != null && prev != null && cur > 0 && prev > 0) {
    const g = growth(r, k);
    if (g != null) return Math.abs(g) < 0.05 ? { text: '横ばい', tone: '' } : { text: `${g > 0 ? '+' : ''}${g.toFixed(1)}%`, tone: g > 0 ? 'up' : 'down' };
  }
  return change(cur, prev);
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
