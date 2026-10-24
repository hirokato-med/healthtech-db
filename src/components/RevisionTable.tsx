import { change, money } from '@/lib/earnings';
import type { ForecastRevision } from '@/lib/types';

const ROWS = [['revenue', '売上高'], ['operatingIncome', '営業利益'], ['ordinaryIncome', '経常利益'], ['netIncome', '純利益']] as const;
const jaDate = (d: string) => d.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, dd) => `${y}年${Number(m)}月${Number(dd)}日`);

/** 業績予想の修正：修正前 → 修正後 と増減 */
export function RevisionTable({ items }: { items: ForecastRevision[] }) {
  return (
    <div className="rev-list">
      {items.map((v) => {
        const a = v.previous?.operatingIncome, b = v.revised.operatingIncome;
        const dir = a == null || b == null ? '修正' : b > a ? '上方修正' : b < a ? '下方修正' : '修正';
        return (
          <div key={v.pdf} className="rev-item">
            <div className="rev-head">
              <span className={`rev-dir ${dir === '上方修正' ? 'up' : dir === '下方修正' ? 'down' : ''}`}>{dir}</span>
              <b>{jaDate(v.date)}</b>
              <span className="muted">{v.fiscalYear ? `${v.fiscalYear} 通期予想` : '通期予想'}{v.consolidated === false ? '（個別）' : ''}</span>
              <a href={v.pdf} target="_blank" rel="noreferrer" className="h-src">開示資料</a>
            </div>
            <div className="earn-wrap">
              <table className="earn-table rev-table">
                <thead><tr><th></th><th>修正前</th><th>修正後</th><th>増減</th><th>増減率</th></tr></thead>
                <tbody>
                  {ROWS.filter(([k]) => v.revised[k] != null || v.previous?.[k] != null).map(([k, label]) => {
                    const p = v.previous?.[k], r = v.revised[k];
                    const c = change(r, p);
                    return (
                      <tr key={k}>
                        <th scope="row">{label}</th>
                        <td className="num">{money(p)}</td>
                        <td className="num"><b>{money(r)}</b></td>
                        <td className={`num ${p != null && r != null ? (r > p ? 'up' : r < p ? 'down' : '') : ''}`}>{p != null && r != null ? `${r - p > 0 ? '+' : r - p < 0 ? '△' : '±'}${money(Math.abs(r - p))}` : '—'}</td>
                        <td className={`num ${c.tone}`}>{c.text}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="rev-title">{v.title}</p>
          </div>
        );
      })}
    </div>
  );
}
