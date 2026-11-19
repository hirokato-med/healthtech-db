import type { Metadata } from 'next';
import { getOverseas } from '@/lib/data';
import type { Overseas, OverseasClaim, OverseasSource } from '@/lib/types';
import { ym } from '@/lib/ym';
import { activityClaim, activityUnknown, areasJa, countryJa, REGION_JA, STATE_UNCONFIRMED, stateOf } from '@/lib/overseas-label';

export const metadata: Metadata = { title: '海外ヘルステック企業', description: '米国・欧州・アジアの注目ヘルステック企業の一覧。' };
// 上場・資本の状態（事業が続いているかは別に出す）。分からない部分は「未確認」と書き、空のまま文を組まない
const listingText = (o: Overseas) =>
  o.listing === '上場' ? `上場（${o.listedAt ? `${ym(o.listedAt)}${o.market ? `・${o.market}` : ''}` : o.market ? `${o.market}・上場の時期は未確認` : '市場・時期は未確認'}）`
  : o.listing === '買収' ? `${o.acquiredBy ? `${o.acquiredBy}が買収` : '買収済み（買い手は未確認）'}${o.acquiredAt ? `（${ym(o.acquiredAt)}）` : ''}`
  : o.listing === '事業譲渡' ? `${o.acquiredBy ?? '他社'}が技術・事業を取得${o.acquiredAt ? `（${ym(o.acquiredAt)}）` : ''}`
  : o.listing === '閉鎖' ? `閉鎖${o.closedAt ? `（${ym(o.closedAt)}）` : ''}`
  : o.listing === '上場廃止' ? `上場廃止${o.delistedAt ? `（${ym(o.delistedAt)}）` : ''}` : o.listing ?? '';
const KIND: Record<OverseasSource['kind'], string> = { official: '公式', sec: 'SEC', regulator: '規制当局', exchange: '取引所', court: '裁判所・登記', news: '報道', wikipedia: 'Wikipedia', database: '企業DB' };
const ref = (x: OverseasClaim) => (x.status === 'reference' ? <small className="muted">（参考・未照合）</small> : null);
/** 記載の後ろに付ける出典。同じ URL は1つにまとめ、チップには発行元（無ければ資料の種類）を出す */
function Src({ s }: { s?: OverseasSource[] }) {
  if (!s?.length) return null;
  const uniq = [...new Map(s.map((x) => [x.url, x])).values()];
  return (
    <>
      {uniq.slice(0, 3).map((x) => {
        const pub = x.publisher?.split('（')[0].trim();
        const title = [KIND[x.kind] ?? '出典', x.publisher, x.published ? `資料の発表日 ${x.published}` : ''].filter(Boolean).join('・');
        return <a key={x.url} className="ov-src" href={x.url} target="_blank" rel="noreferrer" title={title}>{pub || KIND[x.kind] || '出典'}</a>;
      })}
    </>
  );
}
/** 創業年の値（「2017（親会社 Thirty Madison の創業年）」など）を、年と補足に分けて「2017年創業（補足）」の順に組む */
function Founded({ x }: { x: OverseasClaim }) {
  const m = x.value.match(/^(\d{4})(?:（(.*)）)?$/);
  if (!m) return null;
  return <span>{m[1]}年創業{m[2] && <small className="muted">（{m[2]}）</small>}{ref(x)}<Src s={x.sources} /></span>;
}
// 検索結果などから #ov-… に飛んだとき、固定のヘッダーの下に社名が隠れないようにする
const JUMP = { scrollMarginTop: 120 };

export default function GlobalPage() {
  const all = getOverseas();
  const regions = (['US', 'EU', 'ASIA'] as const).map((r) => ({ r, items: all.filter((o) => o.region === r) })).filter((x) => x.items.length);
  return (
    <>
      <div className="page-head">
        <div className="kicker">Global</div>
        <h1>海外ヘルステック企業</h1>
        <p className="lead">国内企業DBと並行して収集していた海外の注目企業 {all.length} 社。一部の会社には、当時の調査メモにもとづく事業領域のタグを付けています。{all.some((o) => o.claims) ? '創業・上場や買収・いまの提供状況・出来事は、記載ごとに裏づけの資料を付けています（公式発表・SEC などの書類・報道。Wikipedia や企業データベースが出典のものはその旨を表示）。裏づけが見つからない記載は出していません。' : '上場・買収の状況、創業者、事業の説明は、公式発表・公的な書類・報道などで確かめた会社だけに出しています。'}</p>
        <p className="small muted" style={{ marginTop: 8 }}>地域：{regions.map(({ r, items }, i) => <span key={r}>{i ? '・' : ''}<a href={`#region-${r}`}>{REGION_JA[r]}（{items.length}）</a></span>)}</p>
      </div>
      {regions.map(({ r, items }) => {
        return (
          <section className="section" key={r} id={`region-${r}`} style={JUMP}>
            <div className="section-head"><h2>{REGION_JA[r]}（{items.length}）</h2></div>
            <div className="grid">
              {items.map((o) => {
                const c = o.claims;
                // 記載ごとの裏づけがある会社は、裏づけのある記載だけを出す（古い形のデータはそのまま）
                const ok = (k: 'founding' | 'capital' | 'activity') => !c || (c[k]?.verified !== false && (c[k]?.sources?.length ?? 1) > 0);
                // いまの提供状況：主張ごとの照合（claimList）がある会社はそちらで決める。古い claims.activity は claimList が無い会社だけで使う
                const act = activityClaim(o);
                const actOk = act ? act.status === 'confirmed' : ok('activity');
                // 提供状況の値そのものが「不明」のときは、確かめたことがあっても「提供状況が分かった」とは書かない
                const actUnknown = act ? activityUnknown(o) : !ok('activity');
                // 出来事の日・資料の日とは別の、こちらで確かめた日
                const actChecked = act?.recheckedAt ?? c?.activity?.checkedAt ?? o.checkedAt;
                // Wikipedia・企業データベースしか資料がない記載は「参考（未照合）」として出す。買収・閉鎖などの重要事項は確定として出さない
                const weak = (ss?: OverseasSource[]) => !!ss?.length && ss.every((x) => x.kind === 'wikipedia' || x.kind === 'database');
                // 状態（閉鎖・買収・上場廃止）は、その出来事そのものを書いた資料が公式・公的なものかで決める。
                // 状態全体に公式資料が1本あるだけでは確定にしない（dacadoo：破産は企業DBのみ、公式発表は資産取得）
                const KEY: Record<string, RegExp> = { 閉鎖: /破産|清算|閉鎖|解散|事業終了|サービス終了/, 買収: /買収完了|買収|合併/, 上場廃止: /上場廃止/, 事業譲渡: /事業譲渡|資産取得|取得/ };
                const ev = KEY[o.listing ?? ''] ? (o.events ?? []).filter((e) => KEY[o.listing!].test(`${e.type ?? ''}${e.text}`)) : [];
                const capWeak = (weak(c?.capital?.sources) && o.listing !== '未上場') || (ev.length > 0 && ev.every((e) => !e.source || weak([e.source])));
                const events = o.events ?? [];
                const Ev = ({ e }: { e: (typeof events)[number] }) => <li><span>{ym(e.date)}</span>{e.type && !e.text.includes(e.type) ? `${e.type}：` : ''}{e.text}{e.source && weak([e.source]) && <small className="muted">（参考・未照合）</small>}{e.source && <Src s={[e.source]} />}</li>;
                const areas = areasJa(o.areas);
                return (
                <article className="card" id={o.id} key={o.id} style={JUMP}>
                  {/* いまの提供状況を確かめられない会社は、旧ドメインが無関係のサイトになっていることがあるのでリンクしない */}
                  <a className="title" href={(actOk && o.hp) || undefined} target="_blank" rel="noreferrer">{o.name}</a>
                  {areas.length > 0 && <div className="chips">{areas.map((a) => <span key={a} className="chip ghost">{a}</span>)}</div>}
                  {/* 閉鎖・買収などが説明文の終わりにあることが多いので、海外企業のカードでは説明文を途中で切らない */}
                  {o.checkedAt && o.description && <p className="desc" style={{ display: 'block', WebkitLineClamp: 'unset', overflow: 'visible' }}>{o.description}</p>}
                  <div className="meta">
                    <span>{countryJa(o.country)}</span>
                    {!o.claimList && o.foundedYear && ok('founding') && <span>{o.foundedYear}年創業{weak(c?.founding?.sources) && <small className="muted">（参考・未照合）</small>}<Src s={c?.founding?.sources} /></span>}
                    {o.checkedAt && o.claimList ? (() => {
                      // 主張ごとの出典：資料がない主張は出さない。Wikipedia・企業DBだけの主張は「参考・未照合」
                      const cl = o.claimList!;
                      const yr = cl.find((x) => x.key === 'foundedYear' && x.status !== 'unverified');
                      const fs = cl.filter((x) => x.key === 'founder' && x.status !== 'unverified');
                      const st = stateOf(o);
                      return (
                        <>
                          {yr && <Founded x={yr} />}
                          {o.listing && o.listing !== '未上場' && st && (st.ok
                            ? <span className="badge">{listingText(o)}<Src s={st.claims.flatMap((x) => x.sources)} /></span>
                            : st.agreement
                              ? <span><span className="badge">{o.acquiredBy ?? '他社'}による買収で合意</span><small className="muted">（買収の完了は確認待ち）</small><Src s={st.agreement.flatMap((x) => x.sources)} /></span>
                              : <span><span className="badge">{STATE_UNCONFIRMED[o.listing] ?? '状態は未確認'}</span><details className="ov-unv"><summary className="small muted">未照合の情報</summary><small className="muted">{listingText(o)}という情報がありますが、{st.claims.length ? 'Wikipedia・企業データベースなどの参考資料だけで' : '直接書いた資料が見つからず'}、公的資料では確かめていません<Src s={st.claims.flatMap((x) => x.sources)} /></small></details></span>)}
                          {o.activity === '事業終了' && actOk && <span className="badge">{o.activity}</span>}
                          {fs.length > 0 && <span>創業者 {fs.map((x, i) => <span key={x.value}>{i ? ', ' : ''}{x.value}{ref(x)}</span>)}<Src s={fs.flatMap((x) => x.sources)} /></span>}
                        </>
                      );
                    })() : o.checkedAt ? (
                      <>
                        {o.listing && ok('capital') && (capWeak ? <span><span className="badge">{STATE_UNCONFIRMED[o.listing] ?? '状態は未確認'}</span><details className="ov-unv"><summary className="small muted">未照合の情報</summary><small className="muted">{listingText(o)}という情報がありますが、企業データベースなどの参考資料だけで、公的資料では確かめていません<Src s={c?.capital?.sources} /></small></details></span> : <span className="badge">{listingText(o)}<Src s={c?.capital?.sources} /></span>)}
                        {o.activity === '事業終了' && ok('activity') && <span className="badge">{o.activity}</span>}
                        {o.founders.length > 0 && ok('founding') && <span>創業者 {o.founders.join(', ')}</span>}
                      </>
                    ) : <span className="muted">上場・買収の状況と創業者は確認中</span>}
                  </div>
                  {o.checkedAt && events.length ? (
                    <>
                      <ul className="ov-events">{events.slice(-3).map((e) => <Ev key={e.date + e.text} e={e} />)}</ul>
                      {events.length > 3 && (
                        <details className="small muted" style={{ marginTop: 4 }}>
                          <summary>それより前の出来事（{events.length - 3}件）</summary>
                          <ul className="ov-events">{events.slice(0, -3).map((e) => <Ev key={e.date + e.text} e={e} />)}</ul>
                        </details>
                      )}
                    </>
                  ) : null}
                  {act ? (
                    !actUnknown ? (
                      <div className="small muted" style={{ marginTop: 6 }}>いまの提供状況：{act.value}{ref(act)}（{ym(actChecked)}に確認）<Src s={act.sources} /></div>
                    ) : (
                      <div className="small muted" style={{ marginTop: 6 }}>
                        いまの提供状況は確認できていません（{ym(actChecked)}時点）
                        {act.status !== 'unverified' && act.sources.length > 0 && <details><summary>確かめたこと</summary>{act.value}{ref(act)}<Src s={act.sources} /></details>}
                      </div>
                    )
                  ) : c?.activity && ok('activity') ? (
                    <div className="small muted" style={{ marginTop: 6 }}>いまの提供状況：{o.activity}（{ym(c.activity.checkedAt)}に確認）<Src s={c.activity.sources} /></div>
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
