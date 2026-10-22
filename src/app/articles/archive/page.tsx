import type { Metadata } from 'next';
import Link from 'next/link';
import { getArchiveArticles } from '@/lib/data';

export const metadata: Metadata = { title: '記事アーカイブ', description: '2021〜2023年に Healthtech DB が公開していた記事の一覧（本文復元中）。' };

export default function ArchivePage() {
  const items = getArchiveArticles();
  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">トップ</Link> / <Link href="/articles/">記事</Link> / <span>アーカイブ</span></nav>
      <div className="page-head">
        <div className="kicker">Archive</div>
        <h1>記事アーカイブ（2021〜2023）</h1>
        <p className="lead">旧サイトで公開していた記事の題名一覧です。本文は順次復元して<Link href="/articles/">記事</Link>に移します。</p>
      </div>
      <div className="list">
        {items.map((a, i) => (
          <div className="row" key={i} style={{ gridTemplateColumns: '1fr' }}>
            <div>
              <span style={{ fontWeight: 600 }}>{a.title}</span>
              <div className="sub"><span className="chip ghost">{a.category}</span><span>{a.author}</span><span>{a.status}</span></div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
