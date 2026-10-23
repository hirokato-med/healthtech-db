'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationLinkDatum, type SimulationNodeDatum } from 'd3-force';

export type RNode = { id: string; name: string; companyId?: string; exit?: string };
export type REdge = { from: string; to: string; type: string; date?: string };
type SNode = RNode & SimulationNodeDatum & { deg: number };
type SLink = SimulationLinkDatum<SNode> & { type: string; date?: string };

const COLOR: Record<string, string> = { parent: '#123e7c', merger: '#8a909b', investment: '#0e7c86', partnership: '#d08a2c' };
const LABEL: Record<string, string> = { parent: '買収・子会社化', merger: '吸収合併', investment: '出資', partnership: '業務提携' };
const W = 1100;
const H = 760;

/** M&A・資本関係のネットワーク図。点＝会社（大きいほど買い手として多くつながる）、線＝買収・合併・出資・提携 */
export function RelationGraph({ nodes, edges }: { nodes: RNode[]; edges: REdge[] }) {
  const [types, setTypes] = useState<string[]>(Object.keys(LABEL));
  const [focus, setFocus] = useState<string | null>(null);
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});
  const svg = useRef<SVGSVGElement>(null);

  const data = useMemo(() => {
    const es = edges.filter((e) => types.includes(e.type));
    const used = new Set(es.flatMap((e) => [e.from, e.to]));
    const deg: Record<string, number> = {};
    for (const e of es) deg[e.from] = (deg[e.from] ?? 0) + 1;
    const ns: SNode[] = nodes.filter((n) => used.has(n.id)).map((n) => ({ ...n, deg: deg[n.id] ?? 0 }));
    const ls: SLink[] = es.map((e) => ({ source: e.from, target: e.to, type: e.type, date: e.date }));
    return { ns, ls };
  }, [nodes, edges, types]);

  useEffect(() => {
    const ns = data.ns.map((n) => ({ ...n }));
    const ls = data.ls.map((l) => ({ ...l }));
    const sim = forceSimulation<SNode>(ns)
      .force('link', forceLink<SNode, SLink>(ls).id((d) => d.id).distance(46).strength(0.9))
      .force('charge', forceManyBody().strength(-70))
      .force('collide', forceCollide<SNode>().radius((d) => r(d) + 3))
      .force('center', forceCenter(W / 2, H / 2))
      .force('x', forceX(W / 2).strength(0.04))
      .force('y', forceY(H / 2).strength(0.06))
      .stop();
    for (let i = 0; i < 320; i++) sim.tick();
    setPos(Object.fromEntries(ns.map((n) => [n.id, { x: Math.max(12, Math.min(W - 12, n.x ?? 0)), y: Math.max(12, Math.min(H - 12, n.y ?? 0)) }])));
  }, [data]);

  const r = (n: { deg: number }) => (n.deg ? Math.min(22, 6 + n.deg * 2.2) : 4.5);
  const near = useMemo(() => {
    if (!focus) return null;
    const s = new Set([focus]);
    for (const l of data.ls) {
      const a = String(l.source), b = String(l.target);
      if (a === focus) s.add(b);
      if (b === focus) s.add(a);
    }
    return s;
  }, [focus, data]);
  const f = focus ? data.ns.find((n) => n.id === focus) : undefined;

  return (
    <div className="rgraph">
      <div className="rg-controls">
        {Object.entries(LABEL).map(([k, v]) => (
          <label key={k}>
            <input type="checkbox" checked={types.includes(k)} onChange={(e) => setTypes((t) => (e.target.checked ? [...t, k] : t.filter((x) => x !== k)))} />
            <i style={{ background: COLOR[k] }} />{v}
          </label>
        ))}
        <span className="muted small">点をクリックすると、その会社のつながりだけを強調します</span>
      </div>
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="M&A・資本関係のネットワーク図">
        <defs>
          {Object.entries(COLOR).map(([k, c]) => (
            <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill={c} /></marker>
          ))}
        </defs>
        {data.ls.map((l, i) => {
          const a = pos[String(l.source)], b = pos[String(l.target)];
          if (!a || !b) return null;
          const dim = near && !(near.has(String(l.source)) && near.has(String(l.target)));
          const tn = data.ns.find((n) => n.id === String(l.target));
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, rr = tn ? r(tn) + 2 : 6;
          return <line key={i} x1={a.x} y1={a.y} x2={b.x - (dx / d) * rr} y2={b.y - (dy / d) * rr} stroke={COLOR[l.type]} strokeWidth={1.4} strokeDasharray={l.type === 'merger' ? '4 3' : undefined} opacity={dim ? 0.08 : 0.75} markerEnd={`url(#arrow-${l.type})`} />;
        })}
        {data.ns.map((n) => {
          const p = pos[n.id];
          if (!p) return null;
          const dim = near && !near.has(n.id);
          const ended = ['閉鎖', '合併', '活動停止', '対象外'].includes(n.exit ?? '');
          return (
            <g key={n.id} transform={`translate(${p.x},${p.y})`} opacity={dim ? 0.15 : 1} onClick={() => setFocus(focus === n.id ? null : n.id)} style={{ cursor: 'pointer' }}>
              <circle r={r(n)} fill={!n.companyId ? '#ffffff' : ended ? '#d1d5db' : n.deg ? '#123e7c' : '#0e7c86'} stroke={!n.companyId ? '#123e7c' : '#fff'} strokeWidth={1.5} />
              {(n.deg >= 1 || focus === n.id || (near && near.has(n.id))) && (
                <text y={-r(n) - 4} textAnchor="middle" fontSize={n.deg >= 4 ? 13 : n.deg >= 2 ? 11 : 10} fontWeight={n.deg >= 2 ? 800 : 600} fill="var(--ink)" stroke="var(--card)" strokeWidth={3} paintOrder="stroke">{n.name.replace(/^株式会社|株式会社$/g, '')}</text>
              )}
              <title>{n.name}</title>
            </g>
          );
        })}
      </svg>
      <div className="rg-legend">
        <span><i className="dot" style={{ background: '#123e7c' }} />買い手・親会社（DB掲載）</span>
        <span><i className="dot" style={{ background: '#0e7c86' }} />買収された会社</span>
        <span><i className="dot" style={{ background: '#d1d5db' }} />消滅・閉鎖した会社</span>
        <span><i className="dot" style={{ background: '#fff', border: '1.5px solid #123e7c' }} />DB未掲載の会社</span>
      </div>
      {f && (
        <div className="rg-focus">
          <b>{f.name}</b>
          {f.companyId && <Link href={`/companies/${f.companyId}/`} className="arrow">企業ページ</Link>}
          <ul>
            {data.ls.filter((l) => String(l.source) === f.id || String(l.target) === f.id).map((l, i) => {
              const out = String(l.source) === f.id;
              const other = data.ns.find((n) => n.id === String(out ? l.target : l.source));
              return <li key={i}>{out ? '→ ' : '← '}{other?.companyId ? <Link href={`/companies/${other.companyId}/`}>{other.name}</Link> : other?.name}<span className="muted small">（{LABEL[l.type]}{l.date ? `・${l.date.replace(/^(\d{4})-(\d{2})$/, (_, y, m) => `${y}年${Number(m)}月`)}` : ''}）</span></li>;
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
