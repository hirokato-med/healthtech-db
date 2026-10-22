import type { Metadata } from 'next';
import { NewsList } from '@/components/NewsList';
import { getNews } from '@/lib/data';

export const metadata: Metadata = { title: 'ニュース', description: '国内ヘルスケア・ヘルステック企業のプレスリリースを企業DBと紐付けて一覧表示。' };

export default function NewsPage() {
  const news = getNews();
  const last = news[0]?.publishedAt;
  return (
    <>
      <div className="page-head">
        <div className="kicker">News</div>
        <h1>ニュース</h1>
        <p className="lead">PR TIMES に出たヘルスケア関連リリースを収集し、企業DBに紐付けています。{last ? `最終更新 ${last.slice(0, 10)}。` : ''}{news.length} 件。</p>
      </div>
      <NewsList items={news} empty="ニュースは `node pipeline/news.mjs` を実行すると取り込まれます。" />
    </>
  );
}
