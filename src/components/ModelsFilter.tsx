'use client';
import { useEffect, useState } from 'react';

/** 事業のしくみの比較一覧の絞り込み（領域・現在の提供状況・製品／支援サービス）。行の data-* を見て出し分ける */
export function ModelsFilter({ areas, states, kinds }: { areas: string[]; states: string[]; kinds: string[] }) {
  const [area, setArea] = useState('');
  const [state, setState] = useState('');
  const [kind, setKind] = useState('');
  const [n, setN] = useState<number | null>(null);
  // 表示中のうち、比べる単位に入れない記録（事業群・契約）の件数
  const [other, setOther] = useState(0);
  useEffect(() => {
    let c = 0;
    let o = 0;
    document.querySelectorAll<HTMLTableRowElement>('tr[data-area]').forEach((tr) => {
      const ok = (!area || tr.dataset.area === area) && (!state || tr.dataset.state === state) && (!kind || tr.dataset.kind === kind);
      tr.hidden = !ok;
      if (ok) c++;
      if (ok && (tr.dataset.kind === '事業群' || tr.dataset.kind === '契約・出来事')) o++;
    });
    setN(c);
    setOther(o);
  }, [area, state, kind]);
  const sel = (v: string, set: (x: string) => void, opts: string[], all: string, label: string) => (
    <select value={v} onChange={(e) => set(e.target.value)} aria-label={label}>
      <option value="">{all}</option>
      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  return (
    <div className="bm-filters">
      {sel(area, setArea, areas, '領域：すべて', '領域')}
      {sel(state, setState, states, '現在の提供状況：すべて', '現在の提供状況')}
      {sel(kind, setKind, kinds, '製品／支援サービス：すべて', '製品／支援サービス')}
      {n != null && <span className="small muted">{n}件を表示{other > 0 && other < n ? `（比べる単位 ${n - other}件＋事業群・契約の記録 ${other}件）` : ''}</span>}
    </div>
  );
}
