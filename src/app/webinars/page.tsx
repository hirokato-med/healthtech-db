import type { Metadata } from 'next';
import { NEWSLETTER_URL } from '@/components/Footer';
import { getWebinars } from '@/lib/data';

export const metadata: Metadata = { title: 'マンスリーレビュー', description: 'Healthtech DB マンスリーレビュー（月例ウェビナー）の開催履歴。' };

export default function WebinarsPage() {
  const items = [...getWebinars()].reverse();
  return (
    <>
      <div className="page-head">
        <div className="kicker">Monthly Review</div>
        <h1>Healthtech DB マンスリーレビュー</h1>
        <p className="lead">
          毎月のヘルスケア業界ニュースを専門家2人で語り合うランチョンセミナー（毎月1回・正午・Zoomウェビナー）。
          2022年から2023年5月まで17回開催しました。再開のご案内は<a href={NEWSLETTER_URL} target="_blank" rel="noreferrer">メルマガ</a>でお知らせします。
        </p>
      </div>
      <div className="list">
        {items.map((w, i) => (
          <div className="row" key={i}>
            <div className="date mono">{w.date}</div>
            <div>
              {w.url ? <a href={w.url} target="_blank" rel="noreferrer">{w.title}</a> : <span>{w.title}</span>}
              {w.note && <div className="sub"><span>{w.note}</span></div>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
