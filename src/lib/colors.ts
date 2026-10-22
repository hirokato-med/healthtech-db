/**
 * スマートニュース風のカラフルな配色。
 * タブ（ページ）ごとに色を持ち、選択中のタブ色がタブ下の帯・セクション見出しの縦棒に出る。
 * カテゴリにも 1 つずつ色を割り当て、ラベルの文字色とタイルの塗りに使う。
 */
export type TabDef = { href: string; label: string; color: string; ink: string };

export const TABS: TabDef[] = [
  { href: '/', label: 'トップ', color: '#E8384F', ink: '#FFFFFF' },
  { href: '/companies/', label: '企業', color: '#F2711C', ink: '#FFFFFF' },
  { href: '/services/', label: 'サービス', color: '#F5B700', ink: '#3A2A00' },
  { href: '/talents/', label: '人物', color: '#2DB34A', ink: '#FFFFFF' },
  { href: '/categories/', label: 'カテゴリ', color: '#00A3C4', ink: '#FFFFFF' },
  { href: '/news/', label: 'ニュース', color: '#1E6FE8', ink: '#FFFFFF' },
  { href: '/articles/', label: '記事', color: '#6C4AD8', ink: '#FFFFFF' },
  { href: '/global/', label: '海外', color: '#D63AA8', ink: '#FFFFFF' },
  { href: '/webinars/', label: 'マンスリーレビュー', color: '#8D6E63', ink: '#FFFFFF' },
];

/** 検索など、タブに無いページの色 */
export const SEARCH_COLOR = { color: '#1E6FE8', ink: '#FFFFFF' };

export function tabFor(path: string): TabDef | undefined {
  return [...TABS].sort((a, b) => b.href.length - a.href.length).find((t) => (t.href === '/' ? path === '/' : path.startsWith(t.href)));
}

/** カテゴリ用の 14 色（白文字が読める濃さ） */
export const CATEGORY_PALETTE = [
  '#E8384F', '#F2711C', '#D99A00', '#2DB34A', '#00A3C4', '#1E6FE8', '#6C4AD8',
  '#D63AA8', '#0F9D8A', '#C2410C', '#4F7CFF', '#9C27B0', '#7CB342', '#E91E63',
];
