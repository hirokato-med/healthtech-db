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
                // Wikipedia・企業データベースしか資料がない記載は「参考（未照合）」として出す。買収・閉鎖などの重要事項は確定として出さない
                const weak = (ss?: OverseasSource[]) => !!ss?.length && ss.every((x) => x.kind === 'wikipedia' || x.kind === 'database');
                // 状態（閉鎖・買収・上場廃止）は、その出来事そのものを書いた資料が公式・公的なものかで決める。
                // 状態全体に公式資料が1本あるだけでは確定にしない（dacadoo：破産は企業DBのみ、公式発表は資産取得）
                const KEY: Record<string, RegExp> = { 閉鎖: /破産|清算|閉鎖|解散|事業終了|サービス終了/, 買収: /買収完了|買収|合併/, 上場廃止: /上場廃止/, 事業譲渡: /事業譲渡|資産取得|取得/ };
                const ev = KEY[o.listing ?? ''] ? (o.events ?? []).filter((e) => KEY[o.listing!].test(`${e.type ?? ''}${e.text}`)) : [];
                const capWeak = (weak(c?.capital?.sources) && o.listing !== '未上場') || (ev.length > 0 && ev.every((e) => !e.source || weak([e.source])));
                return (
                <article className="card" id={o.id} key={o.id}>
                  {/* いまの提供状況を確かめられない会社は、旧ドメインが無関係のサイトになっていることがあるのでリンクしない */}
                  <a className="title" href={(ok('activity') && o.hp) || undefined} target="_blank" rel="noreferrer">{o.name}</a>
                  <div className="chips">{o.areas.map((a) => <span key={a} className="chip ghost">{a}</span>)}</div>
                  {o.checkedAt && o.description && <p className="desc">{o.description}</p>}
                  <div className="meta">
                    <span>{o.country}</span>
                    {o.foundedYear && ok('founding') && <span>{o.foundedYear}年創業{weak(c?.founding?.sources) && <small className="muted">（参考・未照合）</small>}<Src s={c?.founding?.sources} /></span>}
                    {o.checkedAt ? (
                      <>
                        {o.listing && ok('capital') && (capWeak ? <span><span className="badge">法人状態：確認待ち</span><details className="ov-unv"><summary className="small muted">未照合の情報</summary><small className="muted">{listingText(o)}という情報がありますが、企業データベースなどの参考資料だけで、公的資料では確かめていません<Src s={c?.capital?.sources} /></small></details></span> : <span className="badge">{listingText(o)}<Src s={c?.capital?.sources} /></span>)}
                        {o.activity && o.activity !== '事業継続' && ok('activity') && <span className="badge">{o.activity}</span>}
                        {o.founders.length > 0 && ok('founding') && <span>創業者 {o.founders.join(', ')}</span>}
                      </>
                    ) : <span className="muted">上場・買収の状況と創業者は確認中</span>}
                  </div>
                  {o.checkedAt && o.events?.length ? <ul className="ov-events">{o.events.slice(-3).map((e) => <li key={e.date + e.text}><span>{ym(e.date)}</span>{e.type && !e.text.includes(e.type) ? `${e.type}：` : ''}{e.text}{e.source && weak([e.source]) && <small className="muted">（参考・未照合）</small>}{e.source && <Src s={[e.source]} />}</li>)}</ul> : null}
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
