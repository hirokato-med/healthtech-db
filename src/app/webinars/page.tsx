import type { Metadata } from 'next';
import { NEWSLETTER_URL } from '@/components/Footer';
import { getWebinars } from '@/lib/data';

export const metadata: Metadata = { title: 'マンスリーレビュー', description: 'Healthtech DB マンスリーレビュー（月例ウェビナー）の開催履歴。' };

export default function WebinarsPage() {
  const items = [...getWebinars()].reverse();
  return (
    <div className="narrow">
      <div className="page-head">
        <div className="kicker">マンスリーレビュー</div>
        <h1>Healthtech DB マンスリーレビュー</h1>
        <p className="lead">毎月のヘルスケア業界ニュースを専門家2人で語り合うランチョンセミナー（毎月1回・正午・Zoomウェビナー）。2022年から2023年5月まで開催しました。</p>
      </div>
      <a className="link-line" href={NEWSLETTER_URL} target="_blank" rel="noreferrer">再開のご案内をメルマガで受け取る ↗</a>
      <div className="rows bare">
        {items.map((w, i) => (
          <article className="item with-date" key={i}>
            <div className="date">{w.date}</div>
            <div className="body">
              {w.url ? <a className="title" href={w.url} target="_blank" rel="noreferrer">{w.title} ↗</a> : <span className="title ink">{w.title}</span>}
              {w.note && <div className="meta"><span>{w.note}</span></div>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
