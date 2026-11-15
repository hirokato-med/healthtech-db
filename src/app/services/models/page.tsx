import type { Metadata } from 'next';
import Link from 'next/link';
import { getBusinessModels, getService } from '@/lib/data';

export const metadata: Metadata = { title: '事業のしくみで比べる', description: '対象領域・課題、製品・サービスの種類、利用者・契約者・支払者、収益の得方の4つの軸で、ヘルスケアの事業を並べて比べる。' };

const U = ({ t }: { t?: string }) => (t && /未確認/.test(t) ? <span className="bm-unk">{t}</span> : <>{t}</>);
const j = (a?: string[]) => (a?.length ? a.join('・') : '未確認');
// 一覧では役割の説明を短くする（かっこの中の説明を外す。全文は事業ページ）
const strip = (x: string) => { let t = x; for (let i = 0; i < 4; i++) t = t.replace(/[（(][^（）()]*[）)]/g, ''); return t.replace(/[（(].*$/, '').replace(/[）)]/g, '').replace(/[、。].*$/, '').trim(); };
const brief = (a?: string[]) => (a?.length ? [...new Set(a.flatMap((x) => strip(x).split('・')).map((x) => x.trim()).filter(Boolean))].join('・') : '未確認');

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
          「提供会社に直接払う人」と「最終的に費用を負担する人」は分けています。資料で確かめられない項目は「未確認」と出します。いまは性質の違う {rows.length} 事業の見本で、定義を確かめてから全件に広げます。販売経路・費用負担・薬事・普及実績は「詳しく」を開くと見られます。
        </p>
      </div>
      <div className="table-wrap">
        <table className="bm-table">
          <thead><tr><th>事業</th><th>対象領域・課題</th><th>製品・サービスの種類</th><th>使う人／直接払う／最終的に負担</th><th>収益の得方（提供会社の収入）</th><th>いまの段階</th></tr></thead>
          <tbody>
            {rows.map(({ m, s }) => {
              const r = m.roles ?? {};
              const users = [...new Set([...(r.operatorUser ?? []), ...(r.outputUser ?? [])])];
              const main = (m.adoption ?? []).filter((a) => !a.ref);
              return (
                <tr key={m.id}>
                  <td><Link href={`/services/${m.id}/#business-model`}><b>{s!.name}</b></Link><small>{s!.company}</small>
                    <details className="bm-more"><summary>詳しく</summary>
                      <dl>
                        <dt>販売経路</dt><dd><U t={j(m.channel?.first)} />{m.channel?.deal.length ? `（${m.channel.deal.join('・')}）` : ''}</dd>
                        <dt>顧客側の費用負担</dt><dd><U t={j(m.revenue?.customerRecovery)} /></dd>
                        <dt>薬事・保険</dt><dd>{j(m.regulatory?.values)}／{j(m.reimbursement?.values)}</dd>
                        <dt>普及実績</dt><dd>{main.length ? main.map((a) => `${a.metric}：${a.value}（${a.definition ?? ''}${a.asOf ? `・${a.asOf}` : ''}）`).join(' ') : <span className="bm-unk">製品単体の実績は未確認</span>}</dd>
                      </dl>
                    </details>
                  </td>
                  <td><U t={m.problem?.domain} /></td>
                  <td>{m.offering?.values.map((v) => <span key={v} className="tag">{v}</span>)}</td>
                  <td><i>使う</i><U t={brief(users)} /><i>直接払う</i><U t={brief(r.directPayer)} /><i>最終的に負担</i><U t={brief(r.finalBearer)} /></td>
                  <td>{m.revenue?.values.map((v) => <span key={v} className="tag">{/未確認/.test(v) ? <span className="bm-unk">{v}</span> : v}</span>)}{m.revenue?.unknown && <small className="bm-unk">未確認：{m.revenue.unknown.slice(0, 40)}{m.revenue.unknown.length > 40 ? '…' : ''}</small>}</td>
                  <td><span className="bm-st">{m.stage?.value}</span><small><U t={m.activity?.value} /></small>{m.lastModel ? <small className="bm-unk">表示は最後に確認できたモデル{m.lastModel.asOf ? `（${m.lastModel.asOf}）` : ''}</small> : m.periods?.length ? <small>時期で変化あり</small> : null}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
