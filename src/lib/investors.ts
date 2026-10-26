import type { Investor } from './types';

/** 年ごとの数を出す範囲。資金調達の記録が厚いのは2014年以降 */
export const YEARS = Array.from({ length: 2026 - 2014 + 1 }, (_, i) => 2014 + i);
const NOW = 2026;

export const INVESTOR_TYPES = ['独立系VC', '事業会社（CVC含む）', '金融機関系VC', '大学系VC', '政府系・公的', '個人'] as const;

/** 年ごとの出資の回数・最初と最後の年・リードの回数と、「いつから・いつまで」の一言 */
export function activity(i: Investor) {
  const byYear = new Map<number, number>();
  for (const r of i.rounds) {
    const y = Number((r.date ?? '').slice(0, 4));
    if (y) byYear.set(y, (byYear.get(y) ?? 0) + 1);
  }
  const ys = [...byYear.keys()].sort();
  const first = ys[0], last = ys[ys.length - 1];
  const recent = YEARS.filter((y) => y >= NOW - 2).reduce((s, y) => s + (byYear.get(y) ?? 0), 0);
  const earlierYears = first ? Math.max(1, NOW - 2 - first) : 1;
  const earlier = i.rounds.length - recent;
  let label: string, tone: 'stop' | 'new' | 'up' | 'keep';
  if (last && last <= NOW - 3) { label = `${last}年を最後に記録なし`; tone = 'stop'; }
  else if (first && first >= NOW - 2) { label = `${first}年から出資`; tone = 'new'; }
  else if (recent >= 3 && recent / 3 >= (earlier / earlierYears) * 1.5) { label = '最近ふえている'; tone = 'up'; }
  else { label = `${first}年から続けて出資`; tone = 'keep'; }
  return { byYear, first, last, leads: i.rounds.filter((r) => r.lead).length, label, tone };
}
