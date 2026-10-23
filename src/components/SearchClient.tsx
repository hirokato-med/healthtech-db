'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { withBase } from '@/lib/base';

type Hit = { t: string; id: string; title: string; sub: string; url: string };
const LABEL: Record<string, string> = { company: '企業', service: 'サービス', person: '人物', category: 'カテゴリ', overseas: '海外企業', article: '記事', monthly: '月刊ヘルステック' };

export function SearchClient() {
  const params = useSearchParams();
  const initial = params.get('q') ?? '';
  const [q, setQ] = useState(initial);
  const [index, setIndex] = useState<Hit[] | null>(null);
  useEffect(() => {
    fetch(withBase('/search-index.json'))
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => setIndex([]));
  }, []);
  useEffect(() => setQ(initial), [initial]);
  const hits = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n || !index) return [];
    const terms = n.split(/\s+/).filter(Boolean);
    return index
      .map((h) => {
        const hay = `${h.title} ${h.sub}`.toLowerCase();
        if (!terms.every((t) => hay.includes(t))) return null;
        const score = (h.title.toLowerCase().includes(n) ? 2 : 0) + (h.title.toLowerCase() === n ? 3 : 0);
        return { h, score };
      })
      .filter((x): x is { h: Hit; score: number } => Boolean(x))
      .sort((a, b) => b.score - a.score)
      .slice(0, 100)
      .map((x) => x.h);
  }, [q, index]);

  return (
    <>
      <form className="filterbar" action={withBase('/search/')} method="get" onSubmit={(e) => e.preventDefault()}>
        <input type="search" name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="企業名・サービス名・人物名・カテゴリ" aria-label="検索語" autoFocus />
        <span className="count">{index ? `${hits.length} 件` : '読み込み中…'}</span>
      </form>
      {q && index && !hits.length && <p className="muted">「{q}」に一致する項目はありません。</p>}
      <div className="list">
        {hits.map((h) => (
          <div className="row" key={`${h.t}-${h.id}`}>
            <div className="date">
              <span className="badge">{LABEL[h.t] ?? h.t}</span>
            </div>
            <div>
              <Link href={h.url}>{h.title}</Link>
              <div className="sub">{h.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
