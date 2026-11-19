'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { withBase } from '@/lib/base';

import { search, searchContract, searchGroup, searchRelated, searchSupport, searchUses, type SearchItem as Hit } from '@/lib/search-match';
const LABEL: Record<string, string> = { company: '企業', service: '事業', person: '人物', category: 'カテゴリ', overseas: '海外企業', article: '記事', monthly: '月刊ヘルステック' };

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
  const hits = useMemo(() => (index ? search(index, q) : []), [q, index]);
  // 分野は同じだが、検索語そのものではないもの（DTx で探したときの睡眠アプリ など）は分けて出す
  const related = useMemo(() => (index ? searchRelated(index, q) : []), [q, index]);
  const support = useMemo(() => (index ? searchSupport(index, q) : []), [q, index]);
  const contracts = useMemo(() => (index ? searchContract(index, q) : []), [q, index]);
  const uses = useMemo(() => (index ? searchUses(index, q) : []), [q, index]);
  const groups = useMemo(() => (index ? searchGroup(index, q) : []), [q, index]);

  return (
    <>
      <form className="filterbar" action={withBase('/search/')} method="get" onSubmit={(e) => e.preventDefault()}>
        <input type="search" name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="企業名・サービス名・人物名・カテゴリ" aria-label="検索語" autoFocus />
        <span className="count">{index ? `${hits.length} 件` : '読み込み中…'}</span>
      </form>
      {q && index && !hits.length && <p className="muted">「{q}」に一致する項目はありません。</p>}
      <Rows hits={hits} />
      {uses.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 17 }}>「{q}」を使う診療・健康支援サービス<small className="muted" style={{ marginLeft: 8, fontWeight: 400 }}>製品そのものではなく、それを組み込んだプログラム・法人向けの提供 {uses.length}件</small></h2>
          <Rows hits={uses} />
        </section>
      )}
      {groups.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 17 }}>会社の事業群<small className="muted" style={{ marginLeft: 8, fontWeight: 400 }}>複数の製品をまとめた記録。製品ごとのページへリンクしています {groups.length}件</small></h2>
          <Rows hits={groups} />
        </section>
      )}
      {support.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 17 }}>開発・薬事・販売の支援サービス<small className="muted" style={{ marginLeft: 8, fontWeight: 400 }}>「{q}」を作る・届ける側を支えるもの {support.length}件</small></h2>
          <Rows hits={support} />
        </section>
      )}
      {contracts.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 17 }}>関連する提携・契約<small className="muted" style={{ marginLeft: 8, fontWeight: 400 }}>製品そのものではなく、販売権などの契約 {contracts.length}件</small></h2>
          <Rows hits={contracts} />
        </section>
      )}
      {related.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 17 }}>関連する事業<small className="muted" style={{ marginLeft: 8, fontWeight: 400 }}>同じ分野だが、「{q}」そのものではないもの {related.length}件</small></h2>
          <Rows hits={related} />
        </section>
      )}
    </>
  );
}

function Rows({ hits }: { hits: Hit[] }) {
  return (
    <div className="list">
      {hits.map((h) => (
        <div className="row" key={`${h.t}-${h.id}`}>
          <div className="date">
            <span className="badge">{LABEL[h.t] ?? h.t}</span>
          </div>
          <div>
            <Link href={h.url}>{h.title}</Link>
            <div className="sub">{h.sub}{h.st && h.st !== '提供中' ? <span className="badge" style={{ marginLeft: 8 }}>{h.st}</span> : null}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
