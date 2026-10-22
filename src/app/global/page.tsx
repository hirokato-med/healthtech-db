import type { Metadata } from 'next';
import { getOverseas } from '@/lib/data';

export const metadata: Metadata = { title: '海外ヘルステック企業', description: '米国・欧州・アジアの注目ヘルステック企業の一覧。' };
const REGION: Record<string, string> = { US: 'アメリカ', EU: 'ヨーロッパ', ASIA: 'アジア' };

export default function GlobalPage() {
  const all = getOverseas();
  return (
    <>
      <div className="page-head">
        <div className="kicker">Global</div>
        <h1>海外ヘルステック企業</h1>
        <p className="lead">国内企業DBと並行して収集していた海外の注目企業 {all.length} 社。事業領域のタグは当時の調査メモに基づきます。</p>
      </div>
      {(['US', 'EU', 'ASIA'] as const).map((r) => {
        const items = all.filter((o) => o.region === r);
        if (!items.length) return null;
        return (
          <section className="section" key={r}>
            <div className="section-head"><h2>{REGION[r]}（{items.length}）</h2></div>
            <div className="grid">
              {items.map((o) => (
                <article className="card" id={o.id} key={o.id}>
                  <a className="title" href={o.hp || undefined} target="_blank" rel="noreferrer">{o.name}</a>
                  <div className="chips">{o.areas.map((a) => <span key={a} className="chip ghost">{a}</span>)}</div>
                  {o.note && <p className="desc">{o.note}</p>}
                  <div className="meta">
                    <span>{o.country}</span>
                    {o.foundedYear && <span>{o.foundedYear}年創業</span>}
                    {o.exit && <span className="badge">{o.exit}</span>}
                    {o.founders.length > 0 && <span>{o.founders.join(', ')}</span>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
