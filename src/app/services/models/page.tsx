import type { Metadata } from 'next';
import Link from 'next/link';
import { categoryName, getBusinessModels, getService } from '@/lib/data';
import { isStalledStage, statusLabel, statusClass } from '@/lib/status';
import { ModelsFilter } from '@/components/ModelsFilter';
import type { BusinessModel, Service } from '@/lib/types';

export const metadata: Metadata = { title: '事業のしくみで比べる', description: '対象領域・課題、製品・サービスの種類、使う人・直接払う人・最終的に負担する人、収益の得方の4つの軸で、ヘルスケアの事業を並べて比べる。' };

const U = ({ t }: { t?: string }) => (t && /未確認/.test(t) ? <span className="bm-unk">{t}</span> : <>{t}</>);
const j = (a?: string[]) => (a?.length ? a.join('・') : '未確認');
// 一覧では役割の説明を短くする（かっこの中の説明を外す。全文は事業ページ）
const strip = (x: string) => { let t = x; for (let i = 0; i < 4; i++) t = t.replace(/[（(][^（）()]*[）)]/g, ''); return t.replace(/[（(].*$/, '').replace(/[）)]/g, '').replace(/[、。].*$/, '').trim(); };
// 「なし（上市前）」は、かっこを外すと無料のように読めるので「上市前のため該当なし」と出す
const brief = (a?: string[]) => (a?.length ? [...new Set(a.flatMap((x) => (/^なし[（(]上市前/.test(x) ? ['上市前のため該当なし'] : strip(x).split('・'))).map((x) => x.trim()).filter(Boolean))].join('・') : '未確認');

const SUPPORT = /受託サービス|コンサルティング|事務の代行|人材紹介|求人/;
/** 比較の単位：製品・サービス／支援サービス／事業群・契約（事業群と契約は件数に入れない） */
const kindOf = (m: BusinessModel, s: Service) => (m.recordKind === 'group' || s.kind === 'group' ? '事業群' : m.recordKind === 'contract' || s.kind === 'contract' ? '契約・出来事' : (m.offering?.values ?? []).every((v) => SUPPORT.test(v)) ? '支援サービス' : '製品・サービス');
/** 絞り込みの「現在の提供状況」。事業群は製品ごとに状態があるので、ここでは区分しない（種類の絞り込みで「事業群」を選ぶ） */
const stateOf = (s: Service, kind: string) => {
  if (kind === '事業群' || s.kind === 'group') return '';
  const l = statusLabel(s);
  if (/^提供中/.test(l)) return '提供中';
  if (s.status === '準備中') return isStalledStage(s.stage) ? '開発状況未確認' : '準備中';
  if (/状況未確認/.test(l)) return '提供状況未確認';
  if (/販売終了/.test(l)) return '販売終了';
  return '終了・譲渡・統合';
};
/** 4つの軸と属性を付けた事業の一覧 */
export default function ModelsPage() {
  const rows = Object.values(getBusinessModels()).map((m) => ({ m, s: getService(m.id)! })).filter((x) => x.s).map((x) => { const kind = kindOf(x.m, x.s); return { ...x, kind, state: stateOf(x.s, kind), area: categoryName(x.s.category) }; });
  const units = rows.filter((x) => x.kind === '製品・サービス' || x.kind === '支援サービス').length;
  const uniq = (a: string[]) => [...new Set(a)].sort((p, q) => a.filter((x) => x === q).length - a.filter((x) => x === p).length);
  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">トップ</Link> / <Link href="/services/">事業データベース</Link> / <span>事業のしくみで比べる</span></nav>
      <div className="page-head">
        <div className="kicker">Business model</div>
        <h1>事業のしくみで比べる</h1>
        <p className="lead">
          4つの軸（対象領域・課題／製品・サービスの種類／使う人・直接払う人・最終的に負担する人／収益の得方）と、分類とは別の属性（販売経路・薬事・保険適用・提供段階・事業活動・普及実績）で並べました。
          「提供会社に直接払う人」と「最終的に費用を負担する人」は分けています。資料で確かめられない項目は「未確認」と出します。表には {rows.length} 件を載せています。比べる単位は製品・サービス（支援サービスを含めて {units} 件）で、複数の製品をまとめた事業群・契約の記録（{rows.length - units} 件）は比べる単位に入れず、製品のページへリンクします。販売経路・費用負担・薬事・事業活動・普及実績は「詳しく」を開くと見られます。
        </p>
      </div>
      <ModelsFilter areas={uniq(rows.map((x) => x.area))} states={['提供中', '準備中', '開発状況未確認', '提供状況未確認', '販売終了', '終了・譲渡・統合']} kinds={['製品・サービス', '支援サービス', '事業群', '契約・出来事']} />
      <p className="bm-scroll-hint">表は横にスクロールできます（現在の提供状況は、事業名の下にも出しています）。</p>
      <div className="table-wrap">
        <table className="bm-table">
          <thead><tr><th>事業</th><th>対象領域・課題</th><th>製品・サービスの種類</th><th>使う人／直接払う人／最終的に負担する人</th><th>収益の得方（提供会社の収入）</th><th>現在の提供状況</th></tr></thead>
          <tbody>
            {rows.map(({ m, s, kind, state, area }) => {
              const r = m.roles ?? {};
              const users = [...new Set([...(r.operatorUser ?? []), ...(r.outputUser ?? [])])];
              const main = (m.adoption ?? []).filter((a) => !a.ref);
              return (
                <tr key={m.id} data-area={area} data-state={state} data-kind={kind}>
                  <td><Link href={`/services/${m.id}/#business-model`}><b>{s!.name}</b></Link><small>{s!.company}</small>
                    <span className="bm-st-m"><span className={`badge st-${statusClass(s!)}`}>{statusLabel(s!)}</span></span>
                    <details className="bm-more"><summary>詳しく</summary>
                      <dl>
                        <dt>販売経路</dt><dd><U t={j(m.channel?.first)} />{m.channel?.deal.length ? `（${m.channel.deal.join('・')}）` : ''}</dd>
                        <dt>顧客側の費用負担</dt><dd><U t={j(m.revenue?.customerRecovery)} /></dd>
                        <dt>薬事・保険</dt><dd>{j(m.regulatory?.values)}／{j(m.reimbursement?.values)}</dd>
                        <dt>事業活動</dt><dd><U t={m.activity?.value} /></dd>
                        <dt>普及実績</dt><dd>{main.length ? main.map((a) => `${a.metric}：${a.value}（${a.definition ?? ''}${a.asOf ? `・${a.asOf}` : ''}）`).join(' ') : <span className="bm-unk">製品単体の実績は未確認</span>}</dd>
                      </dl>
                    </details>
                  </td>
                  <td><U t={m.problem?.domain} /></td>
                  <td>{m.offering?.values.map((v) => <span key={v} className="tag">{v}</span>)}</td>
                  <td><i>使う</i><U t={brief(users)} /><i>直接払う人</i><U t={brief(r.directPayer)} /><i>最終的に負担する人</i><U t={brief(r.finalBearer)} /></td>
                  <td>{m.revenue?.values.map((v) => <span key={v} className="tag">{/未確認/.test(v) ? <span className="bm-unk">{v}</span> : v}</span>)}{m.revenue?.unknown && <small className="bm-unk">未確認：{m.revenue.unknown.slice(0, 40)}{m.revenue.unknown.length > 40 ? '…' : ''}</small>}</td>
                  <td><span className={`badge st-${statusClass(s!)}`}>{statusLabel(s!)}</span>{kind !== '製品・サービス' && <small>{kind}</small>}{kind !== '事業群' && <small className="muted">提供段階：{m.stage?.value}</small>}{m.lastModel ? <small className="bm-unk">表示は最後に確認できたモデル{m.lastModel.asOf ? `（${m.lastModel.asOf}）` : ''}</small> : m.periods?.length ? <small>時期で変化あり</small> : null}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
