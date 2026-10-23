import { money } from '@/lib/earnings';

/**
 * 決算期ごとの棒グラフ（1系列）。マイナス（赤字）は 0 の線より下に、別の色で描く。
 * 2つの指標を1枚に重ねない（軸を2本にしない）ため、売上高と営業利益は別々に置く。
 */
export function EarningsBars({ title, points, color, unit }: { title: string; points: { label: string; value?: number; est?: boolean }[]; color: string; unit?: string }) {
  const fmt = (v?: number) => (unit ? (v == null ? '—' : `${v.toLocaleString('ja-JP')}${unit}`) : money(v));
  const W = 520, H = 210, padL = 8, padR = 8, padT = 24, padB = 46;
  const vals = points.map((p) => p.value ?? 0);
  const max = Math.max(0, ...vals), min = Math.min(0, ...vals);
  const span = max - min || 1;
  const y = (v: number) => padT + ((max - v) / span) * (H - padT - padB);
  const bw = Math.min(56, ((W - padL - padR) / points.length) * 0.6);
  const step = (W - padL - padR) / points.length;
  return (
    <figure className="ebars">
      <figcaption>{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}：${points.map((p) => `${p.label} ${fmt(p.value)}`).join('、')}`}>
        <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} className="ebars-zero" />
        {points.map((p, i) => {
          const cx = padL + step * (i + 0.5);
          if (p.value == null) return <text key={i} x={cx} y={y(0) - 6} textAnchor="middle" className="ebars-na">—</text>;
          const top = y(Math.max(0, p.value)), bot = y(Math.min(0, p.value));
          const neg = p.value < 0;
          const h = Math.max(1, bot - top);
          // 実績のうち一番新しい期を濃く、予想は点線の枠で描く
          const lastActual = points.map((q, j) => (!q.est && q.value != null ? j : -1)).reduce((a, b) => Math.max(a, b), -1);
          const last = i === lastActual;
          return (
            <g key={i}>
              {p.est ? (
                <rect x={cx - bw / 2} y={top} width={bw} height={h} rx={4} fill="none" stroke={neg ? '#c0392b' : color} strokeWidth={1.5} strokeDasharray="4 3" />
              ) : (
                <rect x={cx - bw / 2} y={top} width={bw} height={h} rx={4} fill={neg ? '#c0392b' : color} opacity={last ? 1 : 0.62} />
              )}
              <rect x={cx - step / 2} y={padT} width={step} height={H - padT - padB} fill="transparent"><title>{`${p.label}${p.est ? '（会社予想）' : ''}：${fmt(p.value)}`}</title></rect>
              <text x={cx} y={neg ? bot + 13 : top - 6} textAnchor="middle" className={`ebars-val${last ? ' last' : ''}`}>{fmt(p.value)}</text>
              <text x={cx} y={H - 8} textAnchor="middle" className="ebars-x">{p.label}</text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
