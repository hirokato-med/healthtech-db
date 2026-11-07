import Link from 'next/link';
import type { FinanceYear } from '@/lib/types';
import { money } from '@/lib/earnings';

/** 業績の時間軸に重ねる出来事（子会社化・出資・提携・グループ入りなど） */
export type FinEvent = { date: string; kind: '子会社化' | '出資' | '資本業務提携' | 'グループ入り' | '合併' | '売却'; name: string; href?: string; source?: string };

const COLOR: Record<FinEvent['kind'], string> = { 子会社化: '#b45309', グループ入り: '#b45309', 合併: '#6b6259', 売却: '#6b6259', 出資: '#1d4ed8', 資本業務提携: '#1d4ed8' };
const fyLabel = (fy: string) => `${fy.slice(2, 4)}/${Number(fy.slice(5, 7))}`;
const ymJa = (d: string) => d.replace(/^(\d{4})-(\d{2}).*/, (_, y, m) => `${y}年${Number(m)}月`).replace(/^(\d{4})$/, '$1年');

/** 10年の業績（売上高の棒）と営業利益率（別の小さな図）、その間の出来事を同じ時間軸で見せる */
export function FinanceHistoryPanel({ years, events, code, market, healthShare, healthNames, standard, basis }: {
  years: FinanceYear[]; events: FinEvent[]; code?: string; market?: string; healthShare?: number | null; healthNames?: string[]; standard?: string; basis?: string;
}) {
  const ys = years.filter((y) => y.revenue != null).slice(-10);
  if (ys.length < 3) return null;
  const n = ys.length;
  const first = ys[0], last = ys[n - 1], prev = ys[n - 2];
  const cagr = first.revenue! > 0 ? ((last.revenue! / first.revenue!) ** (1 / (n - 1)) - 1) * 100 : null;
  const margins = ys.map((y) => (y.operatingIncome != null && y.revenue ? (y.operatingIncome / y.revenue) * 100 : null));
  const mv = margins.filter((v): v is number => v != null);
  // 出来事を決算期に置く（決算期末より前の、いちばん近い期）。直近の決算期より後のものは一覧だけ
  const startYm = (() => { const [y, m] = first.fy.split('-').map(Number); const s = new Date(y - 1, m, 1); return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}`; })();
  const evs = events.filter((e) => e.date.slice(0, 7) >= startYm).sort((a, b) => a.date.localeCompare(b.date));
  const slot = (d: string) => ys.findIndex((y) => d.slice(0, 7) <= y.fy);

  // 図の大きさ
  const W = 760, H = 250, L = 56, B = 26, T = 44;
  const gap = (W - L - 8) / n, bw = Math.min(46, gap * 0.62);
  const bx = (i: number) => L + gap * i + (gap - bw) / 2;
  const maxV = Math.max(...ys.map((y) => y.revenue!));
  const step = (() => { const raw = maxV / 4; const p = 10 ** Math.floor(Math.log10(raw)); return [1, 2, 2.5, 5, 10].map((k) => k * p).find((k) => k >= raw)!; })();
  const top = step * Math.ceil(maxV / step);
  const by = (v: number) => T + (H - T - B) * (1 - Math.max(0, v) / top);
  const H2 = 110, T2 = 18, B2 = 20;
  const mMin = mv.length ? Math.min(...mv) : 0, mMax = mv.length ? Math.max(...mv) : 1;
  const pad = Math.max(0.5, (mMax - mMin) * 0.25);
  const lo = Math.floor((mMin - pad) * 2) / 2, hi = Math.ceil((mMax + pad) * 2) / 2;
  const my = (v: number) => T2 + (H2 - T2 - B2) * (1 - (v - lo) / (hi - lo || 1));
  const ticks = [lo, (lo + hi) / 2, hi];

  // 出来事の印（同じ期に重なるものは横にずらす）
  const bySlot = new Map<number, number[]>();
  evs.forEach((e, k) => { const s = slot(e.date); if (s >= 0) bySlot.set(s, [...(bySlot.get(s) ?? []), k]); });
  const kinds = [...new Set(evs.map((e) => e.kind))];

  return (
    <section className="panel" id="finance-history">
      <h3>{n}年の業績と、その間の出来事{code && <small className="muted" style={{ marginLeft: 8, fontWeight: 400 }}>{market}・{code}</small>}</h3>
      <p className="muted small" style={{ margin: '0 0 14px' }}>売上高の伸びと、ヘルスケアの事業でいつ何をしたか（子会社化・出資・提携）を同じ時間軸で見る。</p>
      <div className="fh-grid">
        <div className="fh-kpi">
          <div><span>売上高（{fyLabel(last.fy)}期）</span><b>{money(last.revenue)}</b>{prev?.revenue ? <small>前年比 {((last.revenue! / prev.revenue - 1) * 100 >= 0 ? '+' : '')}{((last.revenue! / prev.revenue - 1) * 100).toFixed(1)}%</small> : null}</div>
          {cagr != null && <div><span>{n - 1}年の伸び（年平均）</span><b>{cagr >= 0 ? '+' : ''}{cagr.toFixed(1)}%</b><small>{fyLabel(first.fy)}期 {money(first.revenue)} から</small></div>}
          {margins[n - 1] != null && <div><span>営業利益率</span><b>{margins[n - 1]!.toFixed(1)}%</b>{mv.length > 2 && <small>{mv.length}期の幅 {mMin.toFixed(1)}〜{mMax.toFixed(1)}%</small>}</div>}
          {healthShare != null && healthShare < 99.5 && <div><span>ヘルスケアの売上</span><b>{healthShare.toFixed(0)}%</b><small>{healthNames?.join('、')}</small></div>}
          {evs.length > 0 && <div><span>この{n}年の出来事</span><b>{evs.length}件</b><small>{kinds.map((k) => `${k}${evs.filter((e) => e.kind === k).length}`).join('・')}</small></div>}
        </div>
        <div className="fh-charts">
          <p className="fh-ttl">売上高<small>決算期</small></p>
          {evs.length > 0 && <p className="fh-legend">出来事：{kinds.map((k) => <span key={k}><i style={{ background: COLOR[k] }} />{k}</span>)}</p>}
          <svg viewBox={`0 0 ${W} ${H}`} className="fh-svg" role="img" aria-label="売上高の推移">
            {[0, 1, 2, 3, 4].map((i) => step * i).filter((g) => g <= top).map((g) => (
              <g key={g}><line x1={L} x2={W} y1={by(g)} y2={by(g)} stroke="var(--line)" /><text x={L - 6} y={by(g) + 4} fontSize="10" textAnchor="end" fill="var(--muted)">{g === 0 ? '0' : money(g).replace(/円$/, '')}</text></g>
            ))}
            {ys.map((y, i) => (
              <g key={y.fy}>
                <rect x={bx(i)} y={by(y.revenue!)} width={bw} height={H - B - by(y.revenue!)} rx="3" className={i === n - 1 ? 'fh-bar last' : 'fh-bar'}><title>{`${fyLabel(y.fy)}期 売上高 ${money(y.revenue)}${y.note ? `（${y.note}）` : ''}`}</title></rect>
                <text x={bx(i) + bw / 2} y={H - B + 16} fontSize="11" textAnchor="middle" fill="var(--muted)">{fyLabel(y.fy)}</text>
              </g>
            ))}
            <text x={bx(0) + bw / 2} y={by(first.revenue!) - 6} fontSize="11" textAnchor="middle" fill="var(--ink)">{money(first.revenue)}</text>
            <text x={bx(n - 1) + bw / 2} y={by(last.revenue!) - 6} fontSize="12" fontWeight="700" textAnchor="middle" fill="var(--teal)">{money(last.revenue)}</text>
            {[...bySlot.entries()].map(([s, ks]) => ks.map((k, j) => {
              const cx = bx(s) + bw / 2 + (j - (ks.length - 1) / 2) * 15, cy = 14, e = evs[k];
              return (
                <g key={k}>
                  <line x1={cx} x2={cx} y1={cy + 7} y2={by(ys[s].revenue!) - 18} stroke={COLOR[e.kind]} strokeDasharray="2 3" opacity=".5" />
                  <circle cx={cx} cy={cy} r="7" fill={COLOR[e.kind]}><title>{`${ymJa(e.date)} ${e.kind}：${e.name}`}</title></circle>
                  <text x={cx} y={cy + 3.5} fontSize="9" fontWeight="700" fill="#fff" textAnchor="middle">{k + 1}</text>
                </g>
              );
            }))}
          </svg>
          {mv.length >= 2 && (
            <>
              <p className="fh-ttl" style={{ marginTop: 6 }}>営業利益率</p>
              <svg viewBox={`0 0 ${W} ${H2}`} className="fh-svg" role="img" aria-label="営業利益率の推移">
                {ticks.map((g) => <g key={g}><line x1={L} x2={W} y1={my(g)} y2={my(g)} stroke="var(--line)" /><text x={L - 6} y={my(g) + 4} fontSize="10" textAnchor="end" fill="var(--muted)">{g.toFixed(1)}%</text></g>)}
                <polyline fill="none" stroke="var(--navy)" strokeWidth="2" points={margins.map((v, i) => (v == null ? null : `${bx(i) + bw / 2},${my(v)}`)).filter(Boolean).join(' ')} />
                {margins.map((v, i) => v == null ? null : (
                  <circle key={i} cx={bx(i) + bw / 2} cy={my(v)} r={i === n - 1 ? 4.5 : 3.5} fill={i === n - 1 ? 'var(--navy)' : 'var(--card)'} stroke="var(--navy)" strokeWidth="2"><title>{`${fyLabel(ys[i].fy)}期 ${v.toFixed(1)}%`}</title></circle>
                ))}
                {margins[n - 1] != null && <text x={bx(n - 1) + bw / 2} y={my(margins[n - 1]!) - 9} fontSize="12" fontWeight="700" fill="var(--navy)" textAnchor="middle">{margins[n - 1]!.toFixed(1)}%</text>}
              </svg>
            </>
          )}
        </div>
      </div>
      {evs.length > 0 && (
            <ul className="fh-ev">
              {evs.map((e, k) => (
                <li key={k}>
                  <b style={{ background: COLOR[e.kind] }}>{k + 1}</b>
                  <span className="d">{ymJa(e.date)}</span>
                  <span className="k" style={{ color: COLOR[e.kind], borderColor: COLOR[e.kind] }}>{e.kind}</span>
                  <span className="t">{e.href ? <Link href={e.href}>{e.name}</Link> : e.name}{slot(e.date) < 0 && <small>（直近の決算期のあと）</small>}</span>
                </li>
              ))}
            </ul>
          )}
      <p className="muted small" style={{ marginTop: 10 }}>出典：有価証券報告書・決算短信・会社のIR（{[standard, basis].filter(Boolean).join('・') || '連結'}、百万円を億円に丸めて表示）。出来事は Healthtech DB の資本提携・M&A とグループ会社の記録（会社の発表）。</p>
    </section>
  );
}

export type Peer = { id: string; name: string; fy: string; revenue: number; prior?: number; operatingIncome?: number; healthShare?: number | null; spark?: number[]; cagr?: number | null; self?: boolean };

/** 同じ事業の上場企業と比べる */
export function PeerPanel({ peers, label }: { peers: Peer[]; label: string }) {
  if (peers.length < 2) return null;
  const max = Math.max(...peers.map((p) => p.revenue));
  return (
    <section className="panel" id="peers">
      <h3>同じ事業の上場企業と比べる<small className="muted" style={{ marginLeft: 8, fontWeight: 400 }}>{label}</small></h3>
      <div className="peer-grid">
        {peers.map((p) => {
          const g = p.prior ? (p.revenue / p.prior - 1) * 100 : null;
          const sm = p.spark && p.spark.length >= 3 ? Math.max(...p.spark) : 0;
          return (
            <div key={p.id} className={`peer${p.self ? ' me' : ''}`}>
              <div className="pn">{p.self ? p.name : <Link href={`/companies/${p.id}/`}>{p.name}</Link>}{p.self && <small>このページ</small>}</div>
              <div className="pr"><span>売上高（{p.fy}）</span><b>{money(p.revenue)}</b></div>
              <div className="pbar"><i style={{ width: `${(p.revenue / max) * 100}%` }} /></div>
              {g != null && <div className="pr"><span>前年比</span><b className={g >= 0 ? 'up' : 'down'}>{g >= 0 ? '+' : ''}{g.toFixed(1)}%</b></div>}
              {p.operatingIncome != null && <div className="pr"><span>営業利益率</span><b>{((p.operatingIncome / p.revenue) * 100).toFixed(1)}%</b></div>}
              {p.healthShare != null && <div className="pr"><span>ヘルスケアの売上</span><b>{p.healthShare.toFixed(0)}%</b></div>}
              {sm > 0 && (
                <div className="spark">
                  <svg viewBox={`0 0 ${p.spark!.length * 10} 30`} preserveAspectRatio="none">{p.spark!.map((v, i) => <rect key={i} x={i * 10 + 1.5} y={30 - (v / sm) * 28} width="7" height={(v / sm) * 28} rx="1" className={i === p.spark!.length - 1 ? 'last' : ''} />)}</svg>
                  {p.cagr != null && <small>{p.spark!.length - 1}年の伸び 年平均 {p.cagr >= 0 ? '+' : ''}{p.cagr.toFixed(1)}%</small>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="muted small" style={{ marginTop: 10 }}>直近の通期決算（決算短信、連結）。「ヘルスケアの売上」はヘルスケアに関わるセグメントの売上の割合。</p>
    </section>
  );
}
