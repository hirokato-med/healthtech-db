import type { Metadata } from 'next';
import Link from 'next/link';
import { getBusinessModels, getService } from '@/lib/data';

export const metadata: Metadata = { title: '事業のしくみで比べる', description: '対象領域・課題、製品・サービスの種類、利用者・契約者・支払者、収益の得方の4つの軸で、ヘルスケアの事業を並べて比べる。' };

const U = ({ t }: { t?: string }) => (t && /未確認/.test(t) ? <span className="bm-unk">{t}</span> : <>{t}</>);
const j = (a?: string[]) => (a?.length ? a.join('・') : '未確認');

/** 4つの軸と属性を付けた事業の一覧（まず見本20事業） */
export default function ModelsPage() {
  const rows = Object.values(getBusinessModels()).map((m) => ({ m, s: getService(m.id) })).filter((x) => x.s);
  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">トップ</Link> / <Link href="/services/">事業</Link> / <span>事業のしくみで比べる</span></nav>
      <div className="page-head">
        <div className="kicker">Business model</div>
        <h1>事業のしくみで比べる</h1>
        <p className="lead">
          4つの軸（対象領域・課題／製品・サービスの種類／利用者・契約者・支払者／収益の得方）と、分類とは別の属性（販売経路・薬事・保険適用・提供段階・事業活動・普及実績）で並べました。
          「提供会社に直接払う人」と「最終的に費用を負担する人」は分けています。資料で確かめられない項目は「未確認」と出します。いまは性質の違う {rows.length} 事業の見本で、定義を確かめてから全件に広げます。
        </p>
      </div>
      <div className="table-wrap">
        <table className="bm-table">
          <thead><tr><th>事業</th><th>対象領域・課題</th><th>製品・サービスの種類</th><th>使う人／直接払う／最終的に負担</th><th>収益の得方（提供会社の収入）</th><th>顧客の回収</th><th>販売経路・薬事・保険</th><th>提供段階・事業活動</th><th>普及実績</th></tr></thead>
          <tbody>
            {rows.map(({ m, s }) => {
              const r = m.roles ?? {};
              const a = m.adoption?.[0];
              return (
                <tr key={m.id}>
                  <td><Link href={`/services/${m.id}/#business-model`}><b>{s!.name}</b></Link><small>{s!.company}</small></td>
                  <td><U t={m.problem?.domain} /><small>{m.problem?.who}</small></td>
                  <td>{m.offering?.values.map((v) => <span key={v} className="tag">{v}</span>)}</td>
                  <td><i>使う</i><U t={j(r.operatorUser ?? r.outputUser)} /><i>直接払う</i><U t={j(r.directPayer)} /><i>最終的に負担</i><U t={j(r.finalBearer)} /></td>
                  <td>{m.revenue?.values.map((v) => <span key={v} className="tag">{v}</span>)}</td>
                  <td><U t={j(m.revenue?.customerRecovery)} /></td>
                  <td><U t={j(m.channel?.values)} /><small>{j(m.regulatory?.values)}／{j(m.reimbursement?.values)}</small></td>
                  <td><span className="bm-st">{m.stage?.value}</span><small><U t={m.activity?.value} /></small>{m.periods?.length ? <small>時期で変化あり</small> : null}</td>
                  <td>{a ? <><b><U t={a.value} /></b><small>{a.metric}（{a.definition}）{a.asOf ? `・${a.asOf}` : ''}</small></> : <span className="bm-unk">未確認</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
