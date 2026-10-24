import { change, money, pct } from '@/lib/earnings';
import type { EarningsReport } from '@/lib/types';

/** セグメント別の売上・利益。ヘルスケアに関わるセグメントに印をつけ、売上の構成比を帯で見せる */
export function SegmentTable({ r }: { r: EarningsReport }) {
  const segs = r.segments ?? [];
  const total = segs.reduce((a, s) => a + Math.max(0, s.revenue ?? 0), 0);
  const profitLabel = r.segmentProfitLabel?.replace(/（.*?）/g, '') || 'セグメント利益';
  return (
    <div className="seg-wrap">
      {total > 0 && (
        <div className="seg-stack" role="img" aria-label={`売上の構成：${segs.map((s) => `${s.name} ${total ? (((s.revenue ?? 0) / total) * 100).toFixed(0) : 0}%`).join('、')}`}>
          {segs.filter((s) => (s.revenue ?? 0) > 0).map((s) => (
            <span key={s.name} className={s.healthcare ? 'hc' : ''} style={{ flexGrow: s.revenue }} title={`${s.name}：${money(s.revenue)}（${(((s.revenue ?? 0) / total) * 100).toFixed(1)}%）`}>
              {((s.revenue ?? 0) / total) * 100 >= 9 ? s.name.replace(/事業$|セグメント$/, '') : ''}
            </span>
          ))}
        </div>
      )}
      <div className="earn-wrap">
        <table className="earn-table seg-table">
          <thead>
            <tr><th>セグメント</th><th>売上高</th><th>前年同期比</th><th>構成比</th><th>{profitLabel}</th><th>前年同期比</th><th>利益率</th></tr>
          </thead>
          <tbody>
            {segs.map((s) => {
              const g = change(s.revenue, s.priorRevenue), gp = change(s.profit, s.priorProfit);
              const m = s.revenue && s.profit != null ? (s.profit / s.revenue) * 100 : null;
              return (
                <tr key={s.name} className={s.healthcare ? 'hc' : ''}>
                  <td>{s.name}{s.healthcare && <em className="hc-tag">ヘルスケア</em>}</td>
                  <td className="num">{money(s.revenue)}</td>
                  <td className={`num ${g.tone}`}>{g.text}</td>
                  <td className="num">{total && s.revenue != null ? `${((s.revenue / total) * 100).toFixed(1)}%` : '—'}</td>
                  <td className={`num ${(s.profit ?? 0) < 0 ? 'down' : ''}`}>{money(s.profit)}</td>
                  <td className={`num ${gp.tone}`}>{gp.text}</td>
                  <td className="num">{pct(m, false)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small" style={{ marginTop: 6 }}>
        {r.label.replace(/（中間期）/, '')}{r.quarter !== 'FY' ? '（期初からの累計）' : ''}。{r.segmentProfitLabel ? `利益は会社の示す「${r.segmentProfitLabel}」。` : ''}調整額・全社費用は含めていないため、合計は全社の数字と一致しません。出典：決算短信のセグメント情報。
      </p>
    </div>
  );
}
