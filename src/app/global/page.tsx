import type { Metadata } from 'next';
import { getOverseas } from '@/lib/data';
import type { Overseas, OverseasSource } from '@/lib/types';
import { ym } from '@/lib/ym';

export const metadata: Metadata = { title: '海外ヘルステック企業', description: '米国・欧州・アジアの注目ヘルステック企業の一覧。' };
// 上場・資本の状態（事業が続いているかは別に出す）
const listingText = (o: Overseas) =>
  o.listing === '上場' ? `上場${o.listedAt ? `（${ym(o.listedAt)}${o.market ? `・${o.market}` : ''}）` : ''}`
  : o.listing === '買収' ? `${o.acquiredBy ?? ''}が買収${o.acquiredAt ? `（${ym(o.acquiredAt)}）` : ''}`
  : o.listing === '事業譲渡' ? `${o.acquiredBy ?? '他社'}が技術・事業を取得${o.acquiredAt ? `（${ym(o.acquiredAt)}）` : ''}`
  : o.listing === '閉鎖' ? `閉鎖${o.closedAt ? `（${ym(o.closedAt)}）` : ''}`
  : o.listing === '上場廃止' ? `上場廃止${o.delistedAt ? `（${ym(o.delistedAt)}）` : ''}` : o.listing ?? '';
const KIND: Record<OverseasSource['kind'], string> = { official: '公式', sec: 'SEC', regulator: '規制当局', exchange: '取引所', news: '報道', wikipedia: 'Wikipedia', database: '企業DB' };
/** 記載の後ろに付ける出典（種類と資料の発表日） */
function Src({ s }: { s?: OverseasSource[] }) {
  if (!s?.length) return null;
  return <>{s.slice(0, 2).map((x) => <a key={x.url} className="ov-src" href={x.url} target="_blank" rel="noreferrer" title={x.published ? `資料の発表日 ${x.published}` : undefined}>{KIND[x.kind] ?? '出典'}</a>)}</>;
}
const REGION: Record<string, string> = { US: 'アメリカ', EU: 'ヨーロッパ', ASIA: 'アジア' };

export default function GlobalPage() {
  const all = getOverseas();
  return (
    <>
      <div className="page-head">
        <div className="kicker">Global</div>
        <h1>海外ヘルステック企業</h1>
        <p className="lead">国内企業DBと並行して収集していた海外の注目企業 {all.length} 社。事業領域のタグは当時の調査メモに基づきます。{all.some((o) => o.claims) ? '創業・上場や買収・いまの提供状況・出来事は、記載ごとに裏づけの資料を付けています（公式発表・SEC などの書類・報道。Wikipedia や企業データベースが出典のものはその旨を表示）。裏づけが見つからない記載は出していません。' : '上場・買収の状況、創業者、事業の説明は、公式発表・公的な書類・報道などで確かめた会社だけに出しています。'}</p>
      </div>
      {(['US', 'EU', 'ASIA'] as const).map((r) => {
        const items = all.filter((o) => o.region === r);
        if (!items.length) return null;
        return (
          <section className="section" key={r}>
            <div className="section-head"><h2>{REGION[r]}（{items.length}）</h2></div>
            <div className="grid">
              {items.map((o) => {
                const c = o.claims;
                // 記載ごとの裏づけがある会社は、裏づけのある記載だけを出す（古い形のデータはそのまま）
                const ok = (k: 'founding' | 'capital' | 'activity') => !c || (c[k]?.verified !== false && (c[k]?.sources?.length ?? 1) > 0);
                return (
                <article className="card" id={o.id} key={o.id}>
                  {/* いまの提供状況を確かめられない会社は、旧ドメインが無関係のサイトになっていることがあるのでリンクしない */}
                  <a className="title" href={(ok('activity') && o.hp) || undefined} target="_blank" rel="noreferrer">{o.name}</a>
                  <div className="chips">{o.areas.map((a) => <span key={a} className="chip ghost">{a}</span>)}</div>
                  {o.checkedAt && o.description && <p className="desc">{o.description}</p>}
                  <div className="meta">
                    <span>{o.country}</span>
                    {o.foundedYear && ok('founding') && <span>{o.foundedYear}年創業<Src s={c?.founding?.sources} /></span>}
                    {o.checkedAt ? (
                      <>
                        {o.listing && ok('capital') && <span className="badge">{listingText(o)}<Src s={c?.capital?.sources} /></span>}
                        {o.activity && o.activity !== '事業継続' && ok('activity') && <span className="badge">{o.activity}</span>}
                        {o.founders.length > 0 && ok('founding') && <span>創業者 {o.founders.join(', ')}</span>}
                      </>
                    ) : <span className="muted">上場・買収の状況と創業者は確認中</span>}
                  </div>
                  {o.checkedAt && o.events?.length ? <ul className="ov-events">{o.events.slice(-3).map((e) => <li key={e.date + e.text}><span>{ym(e.date)}</span>{e.type && !e.text.includes(e.type) ? `${e.type}：` : ''}{e.text}{e.source && <Src s={[e.source]} />}</li>)}</ul> : null}
                  {c?.activity && ok('activity') ? (
                    <div className="small muted" style={{ marginTop: 6 }}>提供状況「{o.activity}」は{ym(c.activity.checkedAt)}に確認<Src s={c.activity.sources} /></div>
                  ) : c?.activity ? <div className="small muted" style={{ marginTop: 6 }}>いまの提供状況は確認できていません（{ym(c.activity.checkedAt)}時点）</div>
                  : o.checkedAt && o.sources?.length ? <div className="small muted" style={{ marginTop: 6 }}>{ym(o.checkedAt)}時点で確認・<a href={o.sources[0]} target="_blank" rel="noreferrer">出典</a></div> : null}
                </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
