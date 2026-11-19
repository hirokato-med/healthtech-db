'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { withBase } from '@/lib/base';

import { search, searchContract, searchGroup, searchRelated, searchSupport, searchUses, type SearchItem as Hit } from '@/lib/search-match';
const LABEL: Record<string, string> = { company: '企業', service: '事業', person: '人物', category: 'カテゴリ', overseas: '海外企業', article: '記事', monthly: '月刊ヘルステック' };
/** 検索語が空のときに出す例 */
const EXAMPLES = ['DTx', 'オンライン診療', '画像診断AI', 'PHR', 'メドレー'];
/** 区分ごとに最初に出す件数（「さらに表示」で増やす） */
const PAGE = { main: 100, sub: 50 };

export function SearchClient() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get('q') ?? '';
  const [q, setQ] = useState(initial);
  const [index, setIndex] = useState<Hit[] | null>(null);
  // こちらから URL に書いた検索語。戻る・進むで URL が変わったときだけ、検索欄をその語に合わせる
  const written = useRef(initial);
  useEffect(() => {
    fetch(withBase('/search-index.json'))
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => setIndex([]));
  }, []);
  useEffect(() => {
    if (initial !== written.current) { written.current = initial; setQ(initial); }
  }, [initial]);
  // 検索語を URL に入れる（結果を共有・再読み込みできるように）。打つたびではなく、少し止まってから
  const writeUrl = (v: string) => {
    written.current = v;
    router.replace(v.trim() ? `/search/?q=${encodeURIComponent(v)}` : '/search/', { scroll: false });
  };
  useEffect(() => {
    if (q === written.current) return;
    const t = setTimeout(() => writeUrl(q), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  // 上限で切らずに全件を持ち、件数は全件で出す。画面に出すのは区分ごとに「さらに表示」で増やす
  const all = Infinity;
  const hits = useMemo(() => (index ? search(index, q, all) : []), [q, index]);
  // 分野は同じだが、検索語そのものではないもの（DTx で探したときの睡眠アプリ など）は分けて出す
  const related = useMemo(() => (index ? searchRelated(index, q, all) : []), [q, index]);
  const support = useMemo(() => (index ? searchSupport(index, q, all) : []), [q, index]);
  const contracts = useMemo(() => (index ? searchContract(index, q, all) : []), [q, index]);
  const uses = useMemo(() => (index ? searchUses(index, q, all) : []), [q, index]);
  const groups = useMemo(() => (index ? searchGroup(index, q, all) : []), [q, index]);
  const others = related.length + support.length + contracts.length + uses.length + groups.length;
  const empty = !q.trim();

  return (
    <>
      <form className="filterbar" action={withBase('/search/')} method="get" onSubmit={(e) => { e.preventDefault(); writeUrl(q); }}>
        <input type="search" name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="企業名・サービス名・人物名・カテゴリ" aria-label="検索語" autoFocus />
        {!empty && <span className="count">{index ? `該当 ${hits.length}件${others ? `（ほかに関連 ${others}件）` : ''}` : '読み込み中…'}</span>}
      </form>
      {empty && (
        <p className="muted">
          企業名・サービス名・人物名や、DTx などの言葉で探せます。例：
          {EXAMPLES.map((x, i) => <span key={x}>{i ? '・' : ''}<Link href={`/search/?q=${encodeURIComponent(x)}`}>{x}</Link></span>)}
        </p>
      )}
      {!empty && index && !hits.length && <p className="muted">「{q}」に一致する項目はありません。{others ? '下の関連する項目もご覧ください。' : ''}</p>}
      <More key={`main-${q}`} hits={hits} page={PAGE.main} />
      {uses.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 17 }}>「{q}」を使う診療・健康支援サービス<small className="muted" style={{ marginLeft: 8, fontWeight: 400 }}>製品そのものではなく、それを組み込んだプログラム・法人向けの提供 {uses.length}件</small></h2>
          <More key={`uses-${q}`} hits={uses} page={PAGE.sub} />
        </section>
      )}
      {groups.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 17 }}>会社の事業群<small className="muted" style={{ marginLeft: 8, fontWeight: 400 }}>複数の製品をまとめた記録。製品ごとのページへリンクしています {groups.length}件</small></h2>
          <More key={`groups-${q}`} hits={groups} page={PAGE.sub} />
        </section>
      )}
      {support.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 17 }}>開発・薬事・販売の支援サービス<small className="muted" style={{ marginLeft: 8, fontWeight: 400 }}>「{q}」を作る・届ける側を支えるもの {support.length}件</small></h2>
          <More key={`support-${q}`} hits={support} page={PAGE.sub} />
        </section>
      )}
      {contracts.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 17 }}>関連する提携・契約<small className="muted" style={{ marginLeft: 8, fontWeight: 400 }}>製品そのものではなく、販売権などの契約 {contracts.length}件</small></h2>
          <More key={`contracts-${q}`} hits={contracts} page={PAGE.sub} />
        </section>
      )}
      {related.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 17 }}>関連する事業<small className="muted" style={{ marginLeft: 8, fontWeight: 400 }}>同じ分野だが、「{q}」そのものではないもの {related.length}件。当たった事業の種類を各行に出しています</small></h2>
          <More key={`related-${q}`} hits={related} page={PAGE.sub} showType />
        </section>
      )}
    </>
  );
}

/** 区分の一覧。最初は page 件だけ出し、全件の数と「さらに表示」を付ける */
function More({ hits, page, showType }: { hits: Hit[]; page: number; showType?: boolean }) {
  const [n, setN] = useState(page);
  if (!hits.length) return null;
  const shown = hits.slice(0, n);
  return (
    <>
      <Rows hits={shown} showType={showType} />
      {hits.length > shown.length && (
        <p className="small muted" style={{ marginTop: 8 }}>
          {hits.length}件中{shown.length}件を表示
          <button type="button" className="btn-more" style={{ marginLeft: 12, height: 34, padding: '0 18px' }} onClick={() => setN((x) => x + page)}>さらに表示（残り {hits.length - shown.length}件）</button>
        </p>
      )}
    </>
  );
}

function Rows({ hits, showType }: { hits: Hit[]; showType?: boolean }) {
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
            {showType && h.ty && <div className="small muted">事業の種類：{h.ty.length > 80 ? `${h.ty.slice(0, 79)}…` : h.ty}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
