'use client';
import { useEffect, useState } from 'react';

/** 事業のしくみの比較一覧の絞り込み（領域・提供状態・製品／支援サービス）。行の data-* を見て出し分ける */
export function ModelsFilter({ areas, states, kinds }: { areas: string[]; states: string[]; kinds: string[] }) {
  const [area, setArea] = useState('');
  const [state, setState] = useState('');
  const [kind, setKind] = useState('');
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    let c = 0;
    document.querySelectorAll<HTMLTableRowElement>('tr[data-area]').forEach((tr) => {
      const ok = (!area || tr.dataset.area === area) && (!state || tr.dataset.state === state) && (!kind || tr.dataset.kind === kind);
      tr.hidden = !ok;
      if (ok) c++;
    });
    setN(c);
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
      {sel(state, setState, states, '提供状態：すべて', '提供状態')}
      {sel(kind, setKind, kinds, '製品／支援サービス：すべて', '製品／支援サービス')}
      {n != null && <span className="small muted">{n}件を表示</span>}
    </div>
  );
}
