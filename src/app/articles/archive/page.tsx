import type { Metadata } from 'next';
import Link from 'next/link';
import { getArchiveArticles, getArticle } from '@/lib/data';

export const metadata: Metadata = { title: '旧記事の一覧', description: '2021〜2023年に Healthtech DB が公開していた記事の題名と、同じ題材で書き直した2026年版の記事。' };

export default function ArchivePage() {
  const items = getArchiveArticles();
  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">トップ</Link> / <Link href="/articles/">記事</Link> / <span>旧記事の一覧</span></nav>
      <div className="page-head">
        <div className="kicker">Archive</div>
        <h1>旧記事の一覧（2021〜2023）</h1>
        <p className="lead">旧サイトで公開していた記事の題名です。本文は引き継がず、同じ題材を2026年時点の情報で書き直しました。右側のリンクから新しい記事を読めます。</p>
      </div>
      <div className="list">
        {items.map((a, i) => {
          const next = a.rewrittenAs ? getArticle(a.rewrittenAs) : undefined;
          return (
            <div className="row archive-row" key={i}>
              <div>
                <span className="old">{a.title}</span>
                <div className="sub"><span className="chip ghost">{a.category}</span><span>{a.author}</span></div>
              </div>
              <div className="to">
                {next ? <Link href={`/articles/${next.slug}/`} className="arrow">{next.title}</Link>
                  : a.link ? <Link href={a.link} className="arrow">{a.note}</Link>
                  : <span className="muted small">{a.note ?? '準備中'}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
