import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleCard, FeatureArticle } from '@/components/ArticleCard';
import { getArchiveArticles, getArticles } from '@/lib/data';

export const metadata: Metadata = { title: '記事', description: 'ヘルスケアビジネスの市場・プレイヤー・法規制を解説する記事。' };

export default function ArticlesPage() {
  const [first, ...rest] = getArticles();
  return (
    <div className="narrow">
      <div className="page-head">
        <div className="kicker">記事</div>
        <h1>記事</h1>
        <p className="lead">市場概観、プレイヤー一覧、法規制の解説。ヘルスケアにこれから取り組む新規事業担当者を読者に想定しています。</p>
      </div>
      {first && <FeatureArticle a={first} />}
      <div className="rows bare">{rest.map((a) => <ArticleCard key={a.slug} a={a} />)}</div>
      <Link className="link-line" href="/articles/archive/">2021〜2023年の記事 {getArchiveArticles().length} 本（本文復元中）を見る</Link>
    </div>
  );
}
