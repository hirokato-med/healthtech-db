import Link from 'next/link';
import type { Partnership } from '@/lib/types';

const ROW = 30;
const W = 1120;
const X_AREA = 0, X_L = 128, W_L = 210, X_R = 780, W_R = 300;

/**
 * 提携マップ。領域（疾患・事業領域）ごとの帯に、左に大手（製薬・保険・通信など）、右に相手の会社を並べ、
 * 提携の中身を線の上に書く。終わった提携は灰色の点線。
 */
export function PartnerMap({ items, linkOf }: { items: Partnership[]; linkOf: Record<string, string | undefined> }) {
  const areas = [...new Set(items.map((p) => p.area))];
  let y = 0;
  const bands = areas.map((area) => {
    const ps = items.filter((p) => p.area === area).sort((a, b) => a.from.localeCompare(b.from, 'ja') || (a.date ?? '').localeCompare(b.date ?? ''));
    // 線の交差を減らすため、相手側の並び順の平均（重心）で左右を交互に並べ替える
    let left = [...new Set(ps.map((p) => p.from))];
    let right = [...new Set(ps.map((p) => p.to))];
    const bary = (names: string[], other: string[], side: 'from' | 'to') => {
      const pos = (n: string) => {
        const xs = ps.filter((p) => p[side] === n).map((p) => other.indexOf(side === 'from' ? p.to : p.from) / Math.max(1, other.length - 1));
        return xs.reduce((a, b) => a + b, 0) / xs.length;
      };
      return [...names].sort((a, b) => pos(a) - pos(b) || a.localeCompare(b, 'ja'));
    };
    for (let i = 0; i < 6; i++) {
      right = bary(right, left, 'to');
      left = bary(left, right, 'from');
    }
    const rows = Math.max(left.length, right.length);
    const h = rows * ROW + 24;
    const top = y;
    y += h + 8;
    const ly = (n: string) => top + 12 + (left.indexOf(n) + 0.5) * (rows / left.length) * ROW;
    const ry = (n: string) => top + 12 + (right.indexOf(n) + 0.5) * (rows / right.length) * ROW;
    return { area, ps, left, right, top, h, ly, ry };
  });
  const H = y;
  const box = (x: number, cy: number, w: number, name: string, side: 'l' | 'r') => {
    const href = linkOf[name];
    const label = name.replace(/^株式会社|株式会社$|ホールディングス$/g, '').trim();
    const inner = (
      <>
        <rect x={x} y={cy - 11} width={w} height={22} rx={4} className={`pm-box ${side} ${href ? 'in-db' : ''}`} />
        <text x={x + w / 2} y={cy + 4.5} textAnchor="middle" className="pm-name">{label.length > 22 ? label.slice(0, 21) + '…' : label}</text>
        <title>{name}</title>
      </>
    );
    return href ? <Link key={side + name} href={href}>{inner}</Link> : <g key={side + name}>{inner}</g>;
  };

  return (
    <div className="pmap">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="提携マップ">
        {bands.map((b, i) => (
          <g key={b.area}>
            <rect x={0} y={b.top} width={W} height={b.h} className={i % 2 ? 'pm-band odd' : 'pm-band'} />
            <text x={X_AREA + 10} y={b.top + 22} className="pm-area">{b.area}</text>
            <text x={X_AREA + 10} y={b.top + 40} className="pm-count">{b.ps.length}件</text>
            {b.ps.map((p, j) => {
              const y1 = b.ly(p.from), y2 = b.ry(p.to);
              const x1 = X_L + W_L, x2 = X_R;
              const ended = p.status === '終了';
              // 線が集まる側を避けてラベルを置く（右の会社に線が集まるなら左寄り、左の会社から線が広がるなら右寄り）
              const fanIn = b.ps.filter((q) => q.to === p.to).length, fanOut = b.ps.filter((q) => q.from === p.from).length;
              const t = fanIn > fanOut ? 0.3 : fanOut > fanIn ? 0.72 : 0.5;
              const ease = t * t * (3 - 2 * t);
              const mx = x1 + (x2 - x1) * t, my = y1 + (y2 - y1) * ease;
              return (
                <g key={j} className={`pm-link ${p.type} ${ended ? 'ended' : ''}`}>
                  <path d={`M${x1},${y1} C${x1 + 120},${y1} ${x2 - 120},${y2} ${x2},${y2}`} />
                  <text x={mx} y={my - 3} textAnchor="middle" className="pm-label">{p.label}{ended ? '（終了）' : ''}</text>
                  <title>{`${p.from} × ${p.to}：${p.kind}「${p.label}」${p.date ? `（${p.date.slice(0, 4)}年）` : ''}${p.note ? ` ${p.note}` : ''}`}</title>
                </g>
              );
            })}
            {b.left.map((n) => box(X_L, b.ly(n), W_L, n, 'l'))}
            {b.right.map((n) => box(X_R, b.ry(n), W_R, n, 'r'))}
          </g>
        ))}
      </svg>
    </div>
  );
}
