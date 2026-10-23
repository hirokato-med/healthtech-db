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
        <p className="lead">市場の全体像、主要プレイヤー、資本の動き、制度の解説。ヘルスケアで新規事業・投資・提携を検討している人を読者に想定し、すべて一次情報の出典を付けています。全{articles.length}本。</p>
      </div>
      <div className="grid wide">{articles.map((a) => <ArticleCard key={a.slug} a={a} />)}</div>
      <section className="notice" style={{ marginTop: 28 }}>
        記事はすべて2026年10月時点の情報で書き直しています。2021〜2023年に公開していた記事 {getArchiveArticles().length} 本の題名と、対応する新しい記事は<Link href="/articles/archive/">旧記事の一覧</Link>で確認できます。
      </section>
    </>
  );
}
