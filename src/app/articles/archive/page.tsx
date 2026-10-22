import type { Metadata } from 'next';
import Link from 'next/link';
import { getArchiveArticles } from '@/lib/data';

export const metadata: Metadata = { title: '記事アーカイブ', description: '2021〜2023年に Healthtech DB が公開していた記事の一覧（本文復元中）。' };

export default function ArchivePage() {
  const items = getArchiveArticles();
  return (
    <div className="narrow">
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">トップ</Link>›<Link href="/articles/">記事</Link>›<span>アーカイブ</span></nav>
      <div className="page-head">
        <div className="kicker">アーカイブ</div>
        <h1>記事アーカイブ（2021〜2023）</h1>
        <p className="lead">旧サイトで公開していた記事の題名一覧です。本文は順次復元して記事に移します。</p>
      </div>
      <div className="rows bare">
        {items.map((a, i) => (
          <article className="item" key={i}>
            <div className="body">
              <span className="label">{a.category}</span>
              <span className="title ink">{a.title}</span>
              <div className="meta"><span>{a.author}</span><span className="tag">{a.status}</span></div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
