import type { Metadata } from 'next';
import { NewsList } from '@/components/NewsList';
import { getNews } from '@/lib/data';

export const metadata: Metadata = { title: 'ニュース', description: '国内ヘルスケア・ヘルステック企業のプレスリリースを企業DBと紐付けて一覧表示。' };

export default function NewsPage() {
  const news = getNews();
  return (
    <div className="narrow">
      <div className="page-head">
        <div className="kicker">ニュース</div>
        <h1>ヘルスケアニュース</h1>
        <p className="lead">PR TIMES に出たヘルスケア関連リリースを毎朝収集し、企業DBに載っている会社は企業ページにつないでいます。加藤浩晃のコメント付きのニュースは HealthBiz News で読めます。</p>
      </div>
      <p className="count-text" style={{ margin: '12px 0 4px' }}><b>{news.length}</b> 本{news[0] ? `・${news[0].publishedAt.slice(0, 10)} 更新` : ''}</p>
      <NewsList items={news} empty="ニュースは `node pipeline/news.mjs` を実行すると取り込まれます。" />
    </div>
  );
}
