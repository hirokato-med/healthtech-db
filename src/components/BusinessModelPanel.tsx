import Link from 'next/link';
import type { BmSource, BusinessModel } from '@/lib/types';

const ROLE: [keyof NonNullable<BusinessModel['roles']>, string][] = [
  ['developer', '開発'], ['mah', '製造販売（承認・認証を持つ）'], ['seller', '販売'], ['operator', '運営'], ['brandOwner', 'ブランドの持ち主'],
  ['operatorUser', '操作する人'], ['outputUser', '結果を使う人'], ['subject', 'サービスの対象・データに載る人'], ['supplier', '供給側として参加'], ['recommender', '勧める人（払わない）'],
];
const PAY: [keyof NonNullable<BusinessModel['roles']>, string][] = [['userPaysTo', '利用者が払う相手'], ['contractor', '契約する'], ['directPayer', '提供会社に直接払う'], ['finalBearer', '最終的に費用を負担']];
const ymd = (d?: string) => (d ? d.replace(/^(\d{4})-(\d{2})(?:-(\d{2}))?.*$/, (_, y, m, dd) => `${y}年${Number(m)}月${dd ? `${Number(dd)}日` : ''}`) : '');
const has = (a?: string[]) => !!a?.length && !(a.length === 1 && /^未確認/.test(a[0]));
const U = ({ t }: { t?: string }) => (t && /未確認/.test(t) ? <span className="bm-unk">{t}</span> : <>{t}</>);

/** 項目の出典の数（押すと出典の一覧に移る） */
function Src({ s }: { s?: BmSource[] }) {
  if (!s?.length) return null;
  return <a className="bm-src" href="#bm-sources" title={s.map((x) => x.publisher).filter(Boolean).join('・')}>出典{s.length}</a>;
}

/** 事業のしくみ：4つの軸・役割・お金の流れ・時期ごとの姿・属性・普及実績 */
export function BusinessModelPanel({ m }: { m: BusinessModel }) {
  const r = m.roles ?? {};
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
      {m.entity && <p className="bm-entity">この欄は「{m.entity}」の収入と取引を説明しています。</p>}
      {m.members?.length ? (
        <div className="bm-group"><h4>この事業群に含まれる製品（状態・薬事・開始時期は製品ごと）</h4>
          <table className="bm-members"><thead><tr><th>製品</th><th>現在の提供状況</th><th>薬事</th><th>開始</th></tr></thead>
            <tbody>{m.members.map((x) => <tr key={x.name}><td>{x.existingId ? <Link href={`/services/${x.existingId}/`}>{x.name}</Link> : x.name}</td><td><U t={x.status} />{x.stage && x.stage !== x.status ? <small>（{x.stage}）</small> : null}</td><td><U t={x.regulatory} /></td><td>{x.startedAt || <span className="bm-unk">未確認</span>}</td></tr>)}</tbody></table>
          <p className="small muted">事業群は製品の比較・件数には入れていません。下の4つの軸は事業群全体の説明です。</p>
        </div>
      ) : null}
      {m.lastModel && <p className="bm-last"><b>最後に確認できたモデル</b>{m.lastModel.note}。下の内容は、いまの姿ではありません。</p>}
      <div className="bm-grid4">
        <div><h4>対象領域・課題<Src s={m.problem?.sources} /></h4><b><U t={m.problem?.domain} /></b><p><U t={m.problem?.who} /></p></div>
        <div><h4>製品・サービスの種類<Src s={m.offering?.sources} /></h4><b>{m.offering?.values.join('／')}</b><p>{m.offering?.detail}</p></div>
        <div><h4>利用者・契約者・支払者<Src s={m.roles?.sources} /></h4><p>使う：<U t={[...new Set([...(r.operatorUser ?? []), ...(r.outputUser ?? [])])].join('、') || '未確認'} /></p><p>契約：<U t={(r.contractor ?? []).join('、') || '未確認'} /></p></div>
        <div><h4>収益の得方<Src s={m.revenue?.sources} /></h4><b><U t={m.revenue?.values.join('／')} /></b>{m.revenue?.productSales && <p>製品の販売収入：<U t={m.revenue.productSales} /></p>}{m.revenue?.unknown && <p className="bm-unk">未確認：{m.revenue.unknown}</p>}{m.revenue?.past && <p className="muted">過去の収入：{m.revenue.past}</p>}<p>{m.revenue?.detail}</p></div>
      </div>
      {(roles.length > 0 || pays.length > 0) && (
        <div className="bm-roles">
          {roles.map(([k, l]) => <div key={k}><i>{l}</i><U t={(r[k] as string[]).join('、')} /></div>)}
          {pays.map(([k, l]) => <div key={k} className="pay"><i>{payLabel(k, l)}</i><U t={(r[k] as string[]).join('、')} /></div>)}
        </div>
      )}
      {(m.revenue?.values?.length || m.revenue?.customerRecovery?.length) ? (
        <div className="bm-money">
          <div><h4>提供会社の収入</h4><b><U t={m.revenue?.values.join('／') || '未確認'} /></b></div>
          <div><h4>顧客側の費用負担・収入との関係</h4><b><U t={m.revenue?.customerRecovery?.join('／') || '未確認'} /></b>{m.revenue?.recoveryDetail && <p>{m.revenue.recoveryDetail}</p>}</div>
        </div>
      ) : null}
      {m.periods?.length ? (
        <div className="bm-periods"><h4>時期ごとの姿</h4>
          <table><thead><tr><th>時期</th><th>提供しているもの</th><th>使う人</th><th>契約・直接払う</th><th>最終的に負担</th><th>販売経路</th></tr></thead>
            <tbody>{m.periods.map((p) => <tr key={p.t} className={p.t === 'いま' ? 'now' : ''}><td><b>{p.t}</b></td><td>{p.what}</td><td><U t={p.user} /></td><td><U t={p.pay} /></td><td><U t={p.bear} /></td><td>{p.channel}</td></tr>)}</tbody></table>
        </div>
      ) : null}
      {m.plan && <p className="bm-plan"><b>予定（まだ実現していない）</b>{m.plan}</p>}
      <dl className="bm-attrs">
        <div><dt>販売経路（最初の契約・販売先）</dt><dd><U t={m.channel?.first.join('／') || '未確認'} /><Src s={m.channel?.sources} />{m.channel?.deal.length ? <small>取引の形：{m.channel.deal.join('・')}</small> : null}{m.channel?.delivery.length ? <small>利用者への届け方：{m.channel.delivery.join('・')}</small> : null}</dd></div>
        <div><dt>薬事上の状態</dt><dd><U t={m.regulatory?.values.join('／')} /><Src s={m.regulatory?.sources} />{m.regulatory?.detail && <small>{m.regulatory.detail}</small>}</dd></div>
        <div><dt>保険適用</dt><dd><U t={m.reimbursement?.values.join('／')} /><Src s={m.reimbursement?.sources} />{m.reimbursement?.detail && <small>{m.reimbursement.detail}</small>}</dd></div>
        <div><dt>提供段階</dt><dd><span className="bm-st">{m.stage?.value}</span></dd></div>
        <div><dt>事業活動</dt><dd><U t={m.activity?.value} /><Src s={m.activity?.sources} />{m.activity?.signals?.length ? <ul className="bm-signals">{m.activity.signals.map((x) => <li key={x}>{x}</li>)}</ul> : null}{m.activity?.detail && <small>{m.activity.detail}</small>}{m.activity?.guess && <details className="bm-guess"><summary>編集上の推定</summary><small>{m.activity.guess}</small></details>}</dd></div>
        {m.aiUse && <div><dt>AI の使用</dt><dd><U t={m.aiUse.value} /><Src s={m.aiUse.sources} />{m.aiUse.detail && <small>{m.aiUse.detail}</small>}</dd></div>}
      </dl>
      <div className="bm-adopt"><h4>普及実績</h4>
        {main.length ? (
          <table><thead><tr><th>指標</th><th>何を数えたか</th><th>数値</th><th>時点</th></tr></thead>
            <tbody>{main.map((a) => <tr key={a.metric + a.asOf}><td>{a.metric}{a.scope && a.scope !== '製品単体' ? <small>（{a.scope}）</small> : null}</td><td>{a.definition}</td><td><b><U t={a.value} /></b>{a.status ? <small className="bm-unk">（{a.status}）</small> : null}</td><td>{a.asOf}{a.source && <a className="bm-src" href={a.source.url} target="_blank" rel="noreferrer">出典</a>}</td></tr>)}</tbody></table>
        ) : <p className="bm-unk">製品単体で確かめた実績はありません（未確認）</p>}
        {refs.length > 0 && <p className="bm-ref"><b>参考（製品単体の実績ではない数字）</b>{refs.map((a) => <span key={a.metric + a.asOf}>{a.metric}：{a.value}{a.asOf ? `（${a.asOf}）` : ''}。{a.definition}{a.source && <a className="bm-src" href={a.source.url} target="_blank" rel="noreferrer">出典</a>}</span>)}</p>}
      </div>
      <details className="bm-sources" id="bm-sources"><summary>この欄の出典（{uniq.length}件）</summary>
        <ol>{uniq.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.publisher || s.url.replace(/^https?:\/\//, '').slice(0, 60)}</a>{s.published && !/未確認|不明/.test(s.published) ? <small>（{s.published}）</small> : null}</li>)}</ol>
      </details>
    </section>
  );
}
