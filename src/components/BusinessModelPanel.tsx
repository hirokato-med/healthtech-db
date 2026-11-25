import Link from 'next/link';
import type { BmSource, BusinessModel, Service } from '@/lib/types';
import { getService } from '@/lib/data';
import { statusLabel } from '@/lib/status';
import { jpDates as J } from '@/lib/ym';

const ROLE: [keyof NonNullable<BusinessModel['roles']>, string][] = [
  ['developer', '開発'], ['mah', '製造販売業者（承認・認証・届出の名義）'], ['seller', '販売'], ['operator', '運営'], ['brandOwner', 'ブランドの持ち主'],
  ['operatorUser', '操作する人'], ['outputUser', '結果を使う人'], ['subject', 'サービスの対象・データに載る人'], ['supplier', '供給側として参加'], ['recommender', '勧める人（払わない）'],
];
const PAY: [keyof NonNullable<BusinessModel['roles']>, string][] = [['userPaysTo', '利用者が払う相手'], ['contractor', '契約する'], ['directPayer', '提供会社に直接払う'], ['finalBearer', '最終的に費用を負担']];
const ymd = (d?: string) => (d ? d.replace(/^(\d{4})-(\d{2})(?:-(\d{2}))?.*$/, (_, y, m, dd) => `${y}年${Number(m)}月${dd ? `${Number(dd)}日` : ''}`) : '');
const has = (a?: string[]) => !!a?.length && !(a.length === 1 && /^未確認/.test(a[0]));
const U = ({ t }: { t?: string }) => (t && /未確認/.test(t) ? <span className="bm-unk">{J(t)}</span> : <>{J(t)}</>);
/** 時期ごとの姿の「いま」の行（「いま」「2021-11-17〜いま」など） */
const isNow = (t: string) => t === 'いま' || /〜いま$/.test(t) || /^いま[（(]/.test(t);
const STOPPED = ['終了', '譲渡', '統合', '休止'];

/** 項目の出典の数（押すと出典の一覧に移る） */
function Src({ s }: { s?: BmSource[] }) {
  if (!s?.length) return null;
  return <a className="bm-src" href="#bm-sources" title={s.map((x) => x.publisher).filter(Boolean).join('・')}>出典{s.length}</a>;
}

/** 事業のしくみ：4つの軸・役割・お金の流れ・時期ごとの姿・属性・普及実績 */
export function BusinessModelPanel({ m, s }: { m: BusinessModel; s: Service }) {
  const r = m.roles ?? {};
  const isContract = s.kind === 'contract' || m.recordKind === 'contract';
  // 収益の得方：values が未確認だけのとき、何についての未確認かを見出しで示す（製品の販売収入と合わせて作る）
  const rv = m.revenue;
  const revUnknown = !!rv && (!rv.values?.length || rv.values.every((v) => /^未確認/.test(v)));
  const revHead = !rv ? '' : revUnknown ? (rv.productSales === 'あり' ? '製品の販売収入はある（対価の形は未確認）' : '収入の形は未確認') : rv.values.join('／');
  const showSales = !!rv?.productSales && !/^未確認/.test(rv.productSales) && !(revUnknown && rv.productSales === 'あり');
  // 使う人：操作する人と結果を使う人は分けて出す（同じなら1行）
  const opU = (r.operatorUser ?? []).filter((x) => !/^未確認$/.test(x));
  const outU = (r.outputUser ?? []).filter((x) => !/^未確認$/.test(x));
  const sameUsers = opU.join('、') === outU.join('、');
  // 最後に確認できたモデルの断り書き：終了・譲渡などが確定したときだけ「いまの姿ではない」と言い切る
  const hasNowRow = !!m.periods?.some((p) => isNow(p.t));
  const ended = STOPPED.includes(s.status) || !!s.saleEnded;
  const lastNote = m.lastModel ? J(m.lastModel.note.replace(/[。．]\s*$/, '')) : '';
  const lastTail = !m.lastModel ? '' : hasNowRow
    ? `下の4つの軸と役割の欄は${m.lastModel.asOf ? `${ymd(m.lastModel.asOf)}時点` : 'その時点'}の内容です。いまの姿は「時期ごとの姿」の「いま」の行を見てください。`
    : ended ? '下の内容は、いまの姿ではありません。' : '下の内容はその時点のもので、いまも同じかは確かめていません。';
  // 製品の表の状態は、製品のページがあればそちらの記録から出す（二重に持たない）
  const memberState = (x: NonNullable<BusinessModel['members']>[number]) => {
    const p = x.existingId ? getService(x.existingId) : undefined;
    if (!p) return { label: x.status, stage: x.stage && x.stage !== x.status ? x.stage : undefined };
    return { label: statusLabel(p), stage: p.status === '準備中' ? p.stage : undefined };
  };
  const hasOperator = !!m.periods?.some((p) => p.operator);
  const roles = ROLE.filter(([k]) => has(r[k] as string[] | undefined));
  const pays = PAY.filter(([k]) => (r[k] as string[] | undefined)?.length);
  const ent = m.entity ? m.entity.replace(/[（(].*$/, '') : '';
  const payLabel = (k: string, l: string) => (k === 'directPayer' && ent ? `${ent}に直接払う` : l);
  const all = [m.problem, m.offering, m.roles, m.revenue, m.channel, m.regulatory, m.reimbursement, m.stage, m.activity, m.aiUse].flatMap((x) => x?.sources ?? []).concat((m.adoption ?? []).map((a) => a.source).filter((x): x is BmSource => !!x));
  const uniq = [...new Map(all.map((s) => [s.url, s])).values()];
  // 普及実績：製品単体で確かめた実績を主に、事業全体・会社の売上・予定は参考に
  const main = (m.adoption ?? []).filter((a) => !a.ref);
  const refs = (m.adoption ?? []).filter((a) => a.ref);
  return (
    <section className="panel bm" id="business-model">
      <h3>事業のしくみ<small>（{ymd(m.checkedAt)}に確認・各項目に出典）</small></h3>
      {m.entity && <p className="bm-entity">この欄は「{J(m.entity)}」の収入と取引を説明しています。</p>}
      {m.members?.length ? (
        <div className="bm-group"><h4>{isContract ? 'この契約の対象製品' : 'この事業群に含まれる製品'}（状態・薬事・開始時期は製品ごと）</h4>
          <div className="table-wrap"><table className="bm-members"><thead><tr><th>製品</th><th>現在の提供状況</th><th>薬事</th><th>開始</th></tr></thead>
            <tbody>{m.members.map((x) => { const st = memberState(x); return <tr key={x.name}><td>{x.existingId ? <Link href={`/services/${x.existingId}/`}>{J(x.name)}</Link> : J(x.name)}</td><td><U t={st.label} />{st.stage ? <small>（{st.stage}）</small> : null}</td><td><U t={x.regulatory} /></td><td>{x.startedAt ? <U t={x.startedAt} /> : <span className="bm-unk">未確認</span>}</td></tr>; })}</tbody></table></div>
          <p className="small muted">{isContract ? '契約の記録は製品の比較・件数には入れていません。下の4つの軸は契約全体の説明です。' : '事業群は製品の比較・件数には入れていません。下の4つの軸は事業群全体の説明です。'}</p>
        </div>
      ) : null}
      {m.lastModel && <p className="bm-last"><b>最後に確認できたモデル</b>{lastNote}。{lastTail}</p>}
      <div className="bm-grid4">
        <div><h4>対象領域・課題<Src s={m.problem?.sources} /></h4><b><U t={m.problem?.domain} /></b><p><U t={m.problem?.who} /></p></div>
        <div><h4>製品・サービスの種類<Src s={m.offering?.sources} /></h4><b>{m.offering?.values.join('／')}</b></div>
        <div><h4>利用者・契約者・支払者<Src s={m.roles?.sources} /></h4>{!opU.length && !outU.length ? <p>使う人：<U t="未確認" /></p> : sameUsers ? <p>使う人：<U t={opU.join('、')} /></p> : <>{opU.length > 0 && <p>操作する人：<U t={opU.join('、')} /></p>}{outU.length > 0 && <p>結果を使う人：<U t={outU.join('、')} /></p>}</>}<p>契約：<U t={(r.contractor ?? []).join('、') || '未確認'} /></p></div>
        <div><h4>収益の得方<Src s={m.revenue?.sources} /></h4><b><U t={revHead} /></b>{showSales && <p>製品の販売収入：<U t={rv?.productSales} /></p>}{m.revenue?.unknown && <p className="bm-unk">確かめられていない点あり（下の説明）</p>}</div>
      </div>
      {(m.offering?.detail || m.revenue?.detail || m.revenue?.unknown || m.revenue?.past) && (
        <dl className="bm-explain">
          {m.offering?.detail && <div><dt>製品・サービスの中身</dt><dd>{J(m.offering.detail)}</dd></div>}
          {(m.revenue?.detail || m.revenue?.unknown || m.revenue?.past) && <div><dt>収入の説明</dt><dd>{m.revenue?.unknown && <p className="bm-unk">未確認：{J(m.revenue.unknown)}</p>}{m.revenue?.past && <p className="muted">過去の収入：{J(m.revenue.past)}</p>}{m.revenue?.detail && <p>{J(m.revenue.detail)}</p>}</dd></div>}
        </dl>
      )}
      {(roles.length > 0 || pays.length > 0) && (
        <div className="bm-roles">
          {roles.map(([k, l]) => <div key={k}><i>{l}</i><U t={(r[k] as string[]).join('、')} /></div>)}
          {pays.map(([k, l]) => <div key={k} className="pay"><i>{payLabel(k, l)}</i><U t={(r[k] as string[]).join('、')} /></div>)}
        </div>
      )}
      {(m.revenue?.values?.length || m.revenue?.customerRecovery?.length) ? (
        <div className="bm-money">
          <div><h4>提供会社の収入</h4><b><U t={revHead || '未確認'} /></b></div>
          <div><h4>顧客側の費用負担・収入との関係</h4><b><U t={m.revenue?.customerRecovery?.join('／') || '未確認'} /></b>{m.revenue?.recoveryDetail && <p>{J(m.revenue.recoveryDetail)}</p>}</div>
        </div>
      ) : null}
      {m.periods?.length ? (
        <div className="bm-periods"><h4>時期ごとの姿</h4>
          <div className="table-wrap"><table><thead><tr><th>時期</th><th>提供しているもの</th>{hasOperator && <th>運営</th>}<th>使う人</th><th>契約・直接払う</th><th>最終的に負担</th><th>販売経路</th></tr></thead>
            <tbody>{m.periods.map((p) => <tr key={p.t} className={isNow(p.t) ? 'now' : ''}><td><b>{J(p.t)}</b></td><td><U t={p.what} /></td>{hasOperator && <td><U t={p.operator} /></td>}<td><U t={p.user} /></td><td><U t={p.pay} /></td><td><U t={p.bear} /></td><td><U t={p.channel} /></td></tr>)}</tbody></table></div>
        </div>
      ) : null}
      {m.plan && <p className="bm-plan"><b>予定（まだ実現していない）</b>{J(m.plan)}</p>}
      <dl className="bm-attrs">
        <div><dt>販売経路（最初の契約・販売先）</dt><dd><U t={m.channel?.first.join('／') || '未確認'} /><Src s={m.channel?.sources} />{m.channel?.deal.length ? <small>取引の形：{m.channel.deal.join('・')}</small> : null}{m.channel?.delivery.length ? <small>利用者への届け方：{m.channel.delivery.join('・')}</small> : null}</dd></div>
        <div><dt>薬事上の状態</dt><dd><U t={m.regulatory?.values.join('／')} /><Src s={m.regulatory?.sources} />{m.regulatory?.detail && <small>{J(m.regulatory.detail)}</small>}</dd></div>
        <div><dt>保険適用</dt><dd><U t={m.reimbursement?.values.join('／')} /><Src s={m.reimbursement?.sources} />{m.reimbursement?.detail && <small>{J(m.reimbursement.detail)}</small>}</dd></div>
        <div><dt>提供段階</dt><dd><span className="bm-st">{m.stage?.value}</span></dd></div>
        <div><dt>事業活動</dt><dd><U t={m.activity?.value} /><Src s={m.activity?.sources} />{m.activity?.signals?.length ? <ul className="bm-signals">{m.activity.signals.map((x) => <li key={x}>{J(x)}</li>)}</ul> : null}{m.activity?.detail && <small>{J(m.activity.detail)}</small>}{m.activity?.guess && <details className="bm-guess"><summary>編集上の推定</summary><small>{J(m.activity.guess)}</small></details>}</dd></div>
        {m.aiUse && <div><dt>AI の使用</dt><dd><U t={m.aiUse.value} /><Src s={m.aiUse.sources} />{m.aiUse.detail && <small>{J(m.aiUse.detail)}</small>}</dd></div>}
      </dl>
      <div className="bm-adopt"><h4>普及実績</h4>
        {main.length ? (
          <div className="table-wrap"><table><thead><tr><th>指標</th><th>何を数えたか</th><th>数値</th><th>時点</th></tr></thead>
            <tbody>{main.map((a) => <tr key={a.metric + a.asOf}><td>{a.metric}{a.scope && a.scope !== '製品単体' ? <small>（{a.scope}）</small> : null}</td><td>{J(a.definition)}</td><td><b><U t={a.value} /></b>{a.status ? <small className="bm-unk">（{a.status}）</small> : null}</td><td>{J(a.asOf)}{a.source && <a className="bm-src" href={a.source.url} target="_blank" rel="noreferrer">出典</a>}</td></tr>)}</tbody></table></div>
        ) : <p className="bm-unk">製品単体で確かめた実績はありません（未確認）</p>}
        {refs.length > 0 && <p className="bm-ref"><b>参考（製品単体の実績ではない数字）</b>{refs.map((a) => <span key={a.metric + a.asOf}>{a.metric}：{a.value}{a.asOf ? `（${J(a.asOf)}）` : ''}。{J(a.definition)}{a.source && <a className="bm-src" href={a.source.url} target="_blank" rel="noreferrer">出典</a>}</span>)}</p>}
      </div>
      {m.sourcesChecked && (
        <p className="bm-checked small muted">確かめた公式資料（{ymd(m.sourcesChecked.checkedAt)}）：{([['pricing', '料金'], ['faq', 'FAQ'], ['tokushoho', '特商法表記'], ['terms', '利用規約'], ['appStore', 'アプリストア']] as const).map(([k, l], i) => { const v = m.sourcesChecked?.[k]; const url = v && /^https?:/.test(v) ? v.split(/[\s,、]/)[0] : null; return <span key={k}>{i ? '・' : ''}{url ? <a href={url} target="_blank" rel="noreferrer">{l}</a> : <>{l}（{v && !/^https?:/.test(v) ? '無し' : '未確認'}）</>}</span>; })}</p>
      )}
      <details className="bm-sources" id="bm-sources"><summary>この欄の出典（{uniq.length}件）</summary>
        <ol>{uniq.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.publisher || s.url.replace(/^https?:\/\//, '').slice(0, 60)}</a>{s.published && !/未確認|不明/.test(s.published) ? <small>（{s.published}）</small> : null}</li>)}</ol>
      </details>
    </section>
  );
}
