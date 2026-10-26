'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export type InvestorRow = { id: string; name: string; type: string; companies: number; leads: number; first?: number; last?: number; label: string; tone: string; years: number[] };

const SORTS = { companies: '投資先の数', recent: '最近の出資', leads: 'リードの回数' } as const;

/** 投資家の一覧（種類で絞り込み、並べ替え）。年ごとの出資回数を小さな棒で見せる */
export function InvestorTable({ rows, types, years }: { rows: InvestorRow[]; types: readonly string[]; years: number[] }) {
  const [type, setType] = useState('');
  const [sort, setSort] = useState<keyof typeof SORTS>('companies');
  const [all, setAll] = useState(false);
  const list = useMemo(() => {
    const l = rows.filter((r) => !type || r.type === type);
    const recent = (r: InvestorRow) => r.years.slice(-3).reduce((a, b) => a + b, 0);
    return l.sort((a, b) => (sort === 'leads' ? b.leads - a.leads : sort === 'recent' ? recent(b) - recent(a) : 0) || b.companies - a.companies);
  }, [rows, type, sort]);
  const max = Math.max(1, ...rows.flatMap((r) => r.years));
  const shown = all ? list : list.slice(0, 60);
  return (
    <>
      <div className="inv-filter">
        <div className="chips">
          <button type="button" className={`inv-chip${!type ? ' on' : ''}`} onClick={() => setType('')}>すべて {rows.length}</button>
          {types.map((t) => <button key={t} type="button" className={`inv-chip${type === t ? ' on' : ''}`} onClick={() => setType(t)}>{t} {rows.filter((r) => r.type === t).length}</button>)}
        </div>
        <label className="small">並べ替え <select value={sort} onChange={(e) => setSort(e.target.value as keyof typeof SORTS)}>{Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      </div>
      <div className="earn-wrap">
        <table className="earn-table inv-table">
          <thead><tr><th>投資家</th><th>種類</th><th className="num">投資先</th><th className="num">リード</th><th>年ごとの出資（{years[0]}〜{years[years.length - 1]}年）</th><th>動き</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/investors/${r.id}/`}>{r.name}</Link></td>
                <td className="small">{r.type}</td>
                <td className="num">{r.companies}社</td>
                <td className="num">{r.leads || '—'}</td>
                <td>
                  <span className="inv-spark" role="img" aria-label={years.map((y, i) => `${y}年 ${r.years[i]}回`).join('、')}>
                    {r.years.map((v, i) => <i key={years[i]} style={{ height: `${v ? 3 + (v / max) * 21 : 1}px` }} className={v ? '' : 'z'} title={`${years[i]}年 ${v}回`} />)}
                  </span>
                </td>
                <td><span className={`inv-tone ${r.tone}`}>{r.label}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!all && list.length > 60 && <button type="button" className="more-btn" onClick={() => setAll(true)}>さらに表示（{list.length - 60}件）</button>}
    </>
  );
}
