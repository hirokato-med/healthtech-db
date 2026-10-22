/**
 * 配色: STARTUP DB / Indeed 型。基調色は青1色（Indeed ブルー #2557A7）。
 * タブ・カテゴリに個別の色は持たせない（2026-10-22 加藤さんの依頼でカラフル配色から変更）。
 * 色の実体は globals.css の CSS 変数（--brand 等）。ここでは変数名を返す。
 */
export type TabDef = { href: string; label: string; color: string; ink: string };

const B = 'var(--brand)';
const BI = 'var(--brand-fg)';

export const TABS: TabDef[] = [
  { href: '/', label: 'トップ', color: B, ink: BI },
  { href: '/companies/', label: '企業', color: B, ink: BI },
  { href: '/services/', label: 'サービス', color: B, ink: BI },
  { href: '/talents/', label: '人物', color: B, ink: BI },
  { href: '/categories/', label: 'カテゴリ', color: B, ink: BI },
  { href: '/news/', label: 'ニュース', color: B, ink: BI },
  { href: '/articles/', label: '記事', color: B, ink: BI },
  { href: '/global/', label: '海外', color: B, ink: BI },
  { href: '/webinars/', label: 'マンスリーレビュー', color: B, ink: BI },
];

export const SEARCH_COLOR = { color: B, ink: BI };

export function tabFor(path: string): TabDef | undefined {
  return [...TABS].sort((a, b) => b.href.length - a.href.length).find((t) => (t.href === '/' ? path === '/' : path.startsWith(t.href)));
}

/** カテゴリ色。青1色に統一 */
export const CATEGORY_PALETTE = [B];
