import type { Funding, FundingRound } from './types';

/** 資金の調達にあたるラウンドか（子会社化などの M&A は除く） */
export const isRaise = (r: FundingRound) => r.round !== 'M&A';
/** 「2025-01」→「2025年1月」 */
export const ymJa = (s?: string) => (s ?? '').replace(/^(\d{4})-(\d{2})$/, (_, y, m) => `${y}年${Number(m)}月`).replace(/^(\d{4})$/, '$1年');

/** 会社ごとの要約：会社発表の累計があればそれを、なければ公表された金額の合計を使う */
export const fundingSummary = (f?: Funding) => {
  if (!f) return undefined;
  const raises = f.rounds.filter(isRaise);
  const known = raises.filter((r) => r.amount != null);
  const sum = known.reduce((s, r) => s + (r.amount ?? 0), 0);
  const latest = raises[raises.length - 1];
  const total = f.total ? { amount: f.total.amount, kind: '会社発表の累計' as const, asOf: f.total.asOf } : sum > 0 ? { amount: sum, kind: '公表額の合計' as const, asOf: latest?.date } : undefined;
  return { raises, known, sum, latest, total, first: raises[0] };
};

/** 引受先の名前をそろえる（法人格・ファンド名のかっこ書きを外す） */
export const investorKey = (n: string) =>
  n.normalize('NFKC')
    .replace(/[（(].*?[)）]/g, '')
    .replace(/株式会社|合同会社|有限会社|一般社団法人|相互会社|\s/g, '')
    .trim();

/** ラウンド名の表示（不明は種類で代える） */
export const roundLabel = (r: FundingRound) => r.round ?? (r.type === '第三者割当増資' ? '第三者割当増資' : r.type);
