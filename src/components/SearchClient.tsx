'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { withBase } from '@/lib/base';

type Hit = { t: string; id: string; title: string; sub: string; url: string };
const LABEL: Record<string, string> = { company: '企業', service: 'サービス', person: '人物', category: 'カテゴリ', overseas: '海外企業', article: '記事' };
const KINDS = ['', 'company', 'service', 'person', 'category', 'article', 'overseas'];

export function SearchClient() {
  const params = useSearchParams();
  const initial = params.get('q') ?? '';
  const [q, setQ] = useState(initial);
  const [kind, setKind] = useState('');
  const [index, setIndex] = useState<Hit[] | null>(null);
  useEffect(() => {
    fetch(withBase('/search-index.json')).then((r) => r.json()).then(setIndex).catch(() => setIndex([]));
  }, []);
  useEffect(() => setQ(initial), [initial]);
  const all = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n || !index) return [];
    const terms = n.split(/\s+/).filter(Boolean);
    return index
      .map((h) => {
        const hay = `${h.title} ${h.sub}`.toLowerCase();
        if (!terms.every((t) => hay.includes(t))) return null;
        return { h, score: (h.title.toLowerCase().includes(n) ? 2 : 0) + (h.title.toLowerCase() === n ? 3 : 0) };
      })
      .filter((x): x is { h: Hit; score: number } => Boolean(x))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.h);
  }, [q, index]);
  const hits = (kind ? all.filter((h) => h.t === kind) : all).slice(0, 100);

  return (
    <>
      <form className="searchbar" action={withBase('/search/')} method="get" onSubmit={(e) => e.preventDefault()}>
        <label className="in">
          <span>キーワード</span>
          <input type="search" name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="企業名・サービス名・人物名・カテゴリ" autoFocus />
        </label>
      </form>
      {q && (
        <nav className="tabs" style={{ margin: '0 -16px 4px', borderBottom: '1px solid var(--line)' }} aria-label="種類で絞り込み">
          {KINDS.map((k) => {
            const n = k ? all.filter((h) => h.t === k).length : all.length;
            return (
              <button key={k || 'all'} type="button" className="tab" aria-current={kind === k ? 'page' : undefined} onClick={() => setKind(k)} style={{ background: 'none', border: 0, font: 'inherit', cursor: 'pointer' }}>
                {k ? LABEL[k] : 'すべて'} <span className="mono" style={{ color: 'var(--up)', fontSize: 12 }}>{n}</span>
              </button>
            );
          })}
        </nav>
      )}
      {!q && <p className="muted small">例: オンライン診療、カケハシ、PHR、医療機器</p>}
      {q && index && !hits.length && <p className="muted small" style={{ padding: '16px 0' }}>「{q}」に一致する項目はありません。</p>}
      {!index && q && <p className="muted small">読み込み中…</p>}
      <div className="rows bare">
        {hits.map((h) => (
          <article className="item" key={`${h.t}-${h.id}`}>
            <div className="body">
              <span className="label">{LABEL[h.t] ?? h.t}</span>
              <Link href={h.url} className="title">{h.title}</Link>
              {h.sub && <p className="desc">{h.sub}</p>}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
