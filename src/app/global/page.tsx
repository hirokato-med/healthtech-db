import type { Metadata } from 'next';
import { getOverseas } from '@/lib/data';
import type { Overseas } from '@/lib/types';
import { ym } from '@/lib/ym';

export const metadata: Metadata = { title: '海外ヘルステック企業', description: '米国・欧州・アジアの注目ヘルステック企業の一覧。' };
// 上場・資本の状態（事業が続いているかは別に出す）
const listingText = (o: Overseas) =>
  o.listing === '上場' ? `上場${o.listedAt ? `（${ym(o.listedAt)}${o.market ? `・${o.market}` : ''}）` : ''}`
  : o.listing === '買収' ? `${o.acquiredBy ?? ''}が買収${o.acquiredAt ? `（${ym(o.acquiredAt)}）` : ''}`
  : o.listing === '閉鎖' ? `閉鎖${o.closedAt ? `（${ym(o.closedAt)}）` : ''}` : o.listing ?? '';
const REGION: Record<string, string> = { US: 'アメリカ', EU: 'ヨーロッパ', ASIA: 'アジア' };

export default function GlobalPage() {
  const all = getOverseas();
  return (
    <>
      <div className="page-head">
        <div className="kicker">Global</div>
        <h1>海外ヘルステック企業</h1>
        <p className="lead">国内企業DBと並行して収集していた海外の注目企業 {all.length} 社。事業領域のタグは当時の調査メモに基づきます。上場・買収の状況、創業者、事業の説明は、一次情報で確かめた会社だけに出しています。</p>
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
                  {o.checkedAt && o.description && <p className="desc">{o.description}</p>}
                  <div className="meta">
                    <span>{o.country}</span>
                    {o.foundedYear && <span>{o.foundedYear}年創業</span>}
                    {o.checkedAt ? (
                      <>
                        {o.listing && <span className="badge">{listingText(o)}</span>}
                        {o.activity && o.activity !== '事業継続' && <span className="badge">{o.activity}</span>}
                        {o.founders.length > 0 && <span>創業者 {o.founders.join(', ')}</span>}
                      </>
                    ) : <span className="muted">上場・買収の状況と創業者は確認中</span>}
                  </div>
                  {o.checkedAt && o.sources?.length ? <div className="small muted" style={{ marginTop: 6 }}>{ym(o.checkedAt)}時点で確認・<a href={o.sources[0]} target="_blank" rel="noreferrer">出典</a></div> : null}
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
