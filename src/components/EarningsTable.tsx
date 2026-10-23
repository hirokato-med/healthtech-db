'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { type EarningsRow, forecastLabel, forecastOf, margin, money, pct, yoy } from '@/lib/earnings';

type Key = 'revenue' | 'growth' | 'op' | 'margin' | 'date' | 'code';
const MARKETS = ['東証プライム', '東証スタンダード', '東証グロース'];

/** 上場ヘルスケア企業の決算一覧（並べ替え・市場で絞り込み） */
export function EarningsTable({ rows, catName }: { rows: EarningsRow[]; catName: Record<string, string> }) {
  const [key, setKey] = useState<Key>('revenue');
  const [desc, setDesc] = useState(true);
  const [market, setMarket] = useState('');
  const val = (r: EarningsRow): number | string | null => {
    const c = r.latest?.current, p = r.latest?.prior;
    switch (key) {
      case 'revenue': return c?.revenue ?? null;
      case 'growth': return yoy(c?.revenue, p?.revenue);
      case 'op': return c?.operatingIncome ?? null;
      case 'margin': return margin(c);
      case 'date': return r.latest?.date ?? null;
      case 'code': return r.code;
    }
  };
  const list = useMemo(() => {
    const xs = rows.filter((r) => !market || r.market === market);
    return [...xs].sort((a, b) => {
      const x = val(a), y = val(b);
      if (x == null && y == null) return a.code.localeCompare(b.code);
      if (x == null) return 1;
      if (y == null) return -1;
      const d = typeof x === 'string' ? x.localeCompare(String(y)) : x - (y as number);
      return desc ? -d : d;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, key, desc, market]);
  const th = (k: Key, label: string) => (
    <th className={`sortable${key === k ? ' on' : ''}`} onClick={() => (key === k ? setDesc(!desc) : (setKey(k), setDesc(k !== 'code')))}>
      {label}{key === k ? (desc ? ' ▼' : ' ▲') : ''}
    </th>
  );

  return (
    <>
      <div className="filterbar">
        <select value={market} onChange={(e) => setMarket(e.target.value)} aria-label="市場">
          <option value="">すべての市場</option>
          {MARKETS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <span className="count">{list.length} 社</span>
        <span className="muted small">見出しを押すと並べ替えます。金額は直近の決算（四半期は期初からの累計）。</span>
      </div>
      <div className="earn-wrap">
        <table className="earn-table">
          <thead>
            <tr>
              {th('code', '会社')}
              <th>直近の決算</th>
              {th('revenue', '売上高')}
              {th('growth', '前年比')}
              {th('op', '営業利益')}
              {th('margin', '営業利益率')}
              <th>会社予想（売上高／営業利益）</th>
              {th('date', '発表日')}
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const c = r.latest?.current, p = r.latest?.prior, f = forecastOf(r.latest);
              const g = yoy(c?.revenue, p?.revenue);
              return (
                <tr key={r.id}>
                  <td className="ecomp">
                    <Link href={`/companies/${r.id}/`}>{r.name.replace(/^株式会社|株式会社$/g, '')}</Link>
                    <small>{r.code}・{r.market.replace('東証', '')}{catName[r.category] ? `・${catName[r.category]}` : ''}</small>
                  </td>
                  {r.latest ? (
                    <>
                      <td className="nw">{r.latest.label.replace(/（中間期）/, '')}{r.latest.consolidated === false && <small>個別</small>}</td>
                      <td className="num">{money(c?.revenue)}</td>
                      <td className={`num ${g == null ? '' : g >= 0 ? 'up' : 'down'}`}>{pct(g)}</td>
                      <td className={`num ${(c?.operatingIncome ?? 0) < 0 ? 'down' : ''}`}>{money(c?.operatingIncome)}</td>
                      <td className="num">{pct(margin(c), false)}</td>
                      <td className="num fc">{f ? <>{money(f.revenue)}／{money(f.operatingIncome)}<small>{forecastLabel(r.latest)}</small></> : '—'}</td>
                      <td className="nw">
                        {r.latest.pdf ? <a href={r.latest.pdf} target="_blank" rel="noreferrer">{r.latest.date.replace(/-/g, '/')}</a> : r.latest.date.replace(/-/g, '/')}
                      </td>
                    </>
                  ) : (
                    <td colSpan={7} className="muted small">集計中（次の決算発表から自動で入ります）</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
