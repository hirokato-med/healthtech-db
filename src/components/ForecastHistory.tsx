import { change, money } from '@/lib/earnings';
import type { EarningsReport, Figures, ForecastRevision } from '@/lib/types';

type Point = { date: string; source: string; fig: Figures; pdf?: string; kind: 'initial' | 'quarter' | 'revision' };
const nextFy = (fy: string) => fy.replace(/^(\d{4})/, (y) => String(Number(y) + 1));
const jaDate = (d: string) => d.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, dd) => `${y}年${Number(m)}月${Number(dd)}日`);
const Q: Record<string, string> = { Q1: '第1四半期', Q2: '第2四半期（中間期）', Q3: '第3四半期' };

/** 決算期ごとの会社予想（通期）の移り変わり：期初予想 → 各四半期の短信 → 業績予想の修正 */
export function forecastTimelines(reports: EarningsReport[], revisions: ForecastRevision[]) {
  const byFy = new Map<string, Point[]>();
  const add = (fy: string, p: Point) => fy && (byFy.get(fy) ?? byFy.set(fy, []).get(fy)!).push(p);
  for (const r of reports) {
    if (r.quarter === 'FY' && r.nextForecast) add(nextFy(r.fiscalYear), { date: r.date, source: `${r.fiscalYear} 決算短信（期初予想）`, fig: r.nextForecast, pdf: r.pdf, kind: 'initial' });
    if (r.quarter !== 'FY' && r.forecast) add(r.fiscalYear, { date: r.date, source: `${Q[r.quarter] ?? r.quarter} 決算短信`, fig: r.forecast, pdf: r.pdf, kind: 'quarter' });
  }
  for (const v of revisions) {
    // 決算期が書かれていない修正は、その時点で予想している決算期（直前の短信の対象）に入れる
    const fy = v.fiscalYear ?? [...byFy.entries()].find(([, ps]) => ps.some((p) => p.date <= v.date))?.[0] ?? '';
    add(fy, { date: v.date, source: '業績予想の修正', fig: v.revised, pdf: v.pdf, kind: 'revision' });
  }
  return [...byFy.entries()]
    .map(([fy, ps]) => ({ fy, points: ps.sort((a, b) => a.date.localeCompare(b.date)) }))
    .sort((a, b) => b.fy.localeCompare(a.fy));
}

export function ForecastHistory({ fy, points }: { fy: string; points: Point[] }) {
  const ITEMS = (['revenue', 'operatingIncome', 'netIncome'] as const).filter((k) => points.some((p) => p.fig[k] != null));
  const label = { revenue: '売上高', operatingIncome: '営業利益', netIncome: '純利益' };
  return (
    <div className="fch">
      <h3>{fy} 通期の会社予想</h3>
      <div className="earn-wrap">
        <table className="earn-table fch-table">
          <thead>
            <tr><th>発表日</th><th>どこで言ったか</th>{ITEMS.map((k) => <th key={k}>{label[k]}</th>)}<th>前回からの変化（営業利益）</th></tr>
          </thead>
          <tbody>
            {points.map((p, i) => {
              const prev = points[i - 1];
              const same = prev && ITEMS.every((k) => prev.fig[k] === p.fig[k]);
              const c = prev ? change(p.fig.operatingIncome, prev.fig.operatingIncome) : undefined;
              const last = i === points.length - 1;
              return (
                <tr key={p.date + p.source} className={`${p.kind === 'revision' ? 'rev' : ''}${last ? ' last' : ''}`}>
                  <td className="nw"><b>{jaDate(p.date)}</b>{last && <em className="fch-now">いまの予想</em>}</td>
                  <td>{p.pdf ? <a href={p.pdf} target="_blank" rel="noreferrer">{p.source}</a> : p.source}</td>
                  {ITEMS.map((k) => {
                    const moved = prev && prev.fig[k] != null && p.fig[k] != null && prev.fig[k] !== p.fig[k];
                    return <td key={k} className={`num${moved ? ' moved' : ''}`}>{money(p.fig[k])}</td>;
                  })}
                  <td className={`num ${c?.tone ?? ''}`}>{!prev ? '最初の予想' : same ? '据え置き' : c && c.text !== '—' ? `${c.text}${p.kind === 'revision' ? (c.tone === 'down' ? '（下方修正）' : c.tone === 'up' ? '（上方修正）' : '') : ''}` : '変更あり'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
