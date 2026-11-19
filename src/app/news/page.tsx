import type { Metadata } from 'next';
import { NewsList } from '@/components/NewsList';
import { fmtDateJa, getNews } from '@/lib/data';

export const metadata: Metadata = { title: 'ニュース', description: '国内ヘルスケア・ヘルステック企業のプレスリリースを企業DBと紐付けて一覧表示。' };

export default function NewsPage() {
  const all = getNews();
  // 対象外（ヘルスケアと直接関係しないリリース）は出さない。事業に関わる変化を先に、そのほかのリリースを後に
  const news = all.filter((n) => n.tier !== 'out');
  const top = news.filter((n) => n.tier === 'top');
  const rest = news.filter((n) => n.tier !== 'top');
  const out = all.length - news.length;
  const last = news[0]?.publishedAt;
  return (
    <>
      <div className="page-head">
        <div className="kicker">News</div>
        <h1>ニュース</h1>
        <p className="lead">PR TIMES に出たヘルスケア関連リリースを収集し、企業DBに紐付けています。{last ? `いちばん新しいリリースは ${fmtDateJa(last)}（日本時間）のものです。` : ''}
          承認・保険適用・事業の開始や終了・買収・資金調達など、事業判断に影響する変化は「事業に関わる変化」として先に並べ、何が変わったかを1文で添えています。
          ヘルスケアと直接関係しないリリース（{out}件）は載せていません。</p>
      </div>
      <h2 className="sec-h">事業に関わる変化<small className="muted"> {top.length}件</small></h2>
      <NewsList items={top} empty="いまは該当するニュースがありません。" />
      <h2 className="sec-h" style={{ marginTop: 32 }}>そのほかのヘルスケア関連リリース<small className="muted"> {rest.length}件</small></h2>
      <NewsList items={rest} empty="いまは該当するリリースがありません。" />
    </>
  );
}
