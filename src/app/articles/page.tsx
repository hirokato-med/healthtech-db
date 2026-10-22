import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleCard } from '@/components/ArticleCard';
import { getArchiveArticles, getArticles } from '@/lib/data';

export const metadata: Metadata = { title: '記事', description: 'ヘルスケアビジネスの市場・プレイヤー・法規制を解説する記事。' };

export default function ArticlesPage() {
  const articles = getArticles();
  return (
    <>
      <div className="page-head">
        <div className="kicker">Articles</div>
        <h1>記事</h1>
        <p className="lead">市場概観、プレイヤー一覧、法規制の解説。ヘルスケア領域に疎いがこれから取り組む新規事業担当者を読者に想定しています。</p>
      </div>
      <div className="grid wide">{articles.map((a) => <ArticleCard key={a.slug} a={a} />)}</div>
      <section className="notice" style={{ marginTop: 28 }}>
        2021〜2023年に公開していた記事 {getArchiveArticles().length} 本は、本文の復元作業中です。題名は<Link href="/articles/archive/">記事アーカイブ</Link>で確認できます。
      </section>
    </>
  );
}
