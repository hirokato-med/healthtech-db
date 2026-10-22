import type { Metadata } from 'next';
import { SectionHead } from '@/components/SectionHead';
import { getOverseas } from '@/lib/data';

export const metadata: Metadata = { title: '海外ヘルステック企業', description: '米国・欧州・アジアの注目ヘルステック企業の一覧。' };
const REGION: Record<string, string> = { US: 'アメリカ', EU: 'ヨーロッパ', ASIA: 'アジア' };

export default function GlobalPage() {
  const all = getOverseas();
  return (
    <div className="narrow">
      <div className="page-head">
        <div className="kicker">海外</div>
        <h1>海外ヘルステック企業</h1>
        <p className="lead">国内企業DBと並行して集めていた海外の注目企業。事業領域のタグは当時の調査メモに基づきます。</p>
      </div>
      {(['US', 'EU', 'ASIA'] as const).map((r) => {
        const items = all.filter((o) => o.region === r);
        if (!items.length) return null;
        return (
          <section className="section" key={r} style={{ marginTop: 20 }}>
            <SectionHead title={REGION[r]} count={`${items.length}社`} />
            <div className="rows">
              {items.map((o) => (
                <article className="item" id={o.id} key={o.id}>
                  <div className="body">
                    {o.areas.length > 0 && <span className="labels">{o.areas.map((a) => <span key={a} className="label">{a}</span>)}</span>}
                    {o.hp ? <a className="title" href={o.hp} target="_blank" rel="noreferrer">{o.name} ↗</a> : <span className="title">{o.name}</span>}
                    {o.note && <p className="desc">{o.note}</p>}
                    <div className="meta">
                      <span className="tag">{o.country}</span>
                      {o.foundedYear && <span className="tag">{o.foundedYear}年創業</span>}
                      {o.exit && <span className="tag">{o.exit}</span>}
                      {o.founders.length > 0 && <span>{o.founders.join(', ')}</span>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
