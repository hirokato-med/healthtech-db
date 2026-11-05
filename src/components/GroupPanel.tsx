import Link from 'next/link';
import type { CompanyGroup } from '@/lib/types';
import { findCompanyByName, getCompany } from '@/lib/data';
import { ym } from '@/lib/ym';

const voting = (m: CompanyGroup['members'][number]) =>
  m.voting != null
    ? `${m.owned ? '被所有 ' : ''}${m.voting.toFixed(1)}%${m.indirect ? `（うち間接 ${m.indirect.toFixed(1)}%）` : ''}`
    : m.whollyOwnedAtAcquisition ? '100%（完全子会社化の時点）' : '—';

/** 会社名。DB に載っていれば企業ページへ */
function Name({ name, formerName, companyId }: { name: string; formerName?: string; companyId?: string }) {
  const o = (companyId && getCompany(companyId)) || findCompanyByName(name);
  const n = name.replace(/^株式会社|株式会社$/g, '');
  return <>{o ? <Link href={`/companies/${o.id}/`}>{n}</Link> : n}{formerName && <small>旧 {formerName.replace(/^株式会社|株式会社$/g, '')}</small>}</>;
}

/** 上場企業のグループ会社：有価証券報告書の「関係会社の状況」（議決権の所有割合）と、沿革に出てくる以前の子会社 */
export function GroupPanel({ g }: { g: CompanyGroup }) {
  // ヘルスケアに関わる会社だけを載せたときは、名前の出ていない会社の数は出さない
  const unnamed = g.scope === 'healthcare' || g.note ? 0 : (g.consolidated ?? 0) - g.members.filter((m) => m.relation === '連結子会社').length;
  return (
    <section className="panel" id="group">
      <h3>グループ会社<small className="muted" style={{ marginLeft: 8, fontWeight: 400 }}>子会社・関連会社</small></h3>
      <p className="small" style={{ margin: '0 0 10px' }}>
        {g.consolidated != null && <>連結子会社 <b>{g.consolidated}社</b></>}
        {g.equityMethod != null && <>・持分法適用会社 <b>{g.equityMethod}社</b></>}
        <span className="muted">（{g.sourceLabel}）</span>
        {g.scope === 'healthcare' && <><br /><span className="muted">ヘルスケア（医療・介護・健康・医薬品・医療機器）に関わる会社だけを載せています。</span></>}
      </p>
      <div className="earn-wrap">
        <table className="earn-table grp-table">
          <thead><tr><th>会社</th><th>関係</th><th>主な事業</th><th className="c">議決権の所有割合</th><th>グループ入り</th></tr></thead>
          <tbody>
            {g.members.map((m) => (
              <tr key={m.name}>
                <td><Name name={m.name} formerName={m.formerName} companyId={m.companyId} />{(m.address || m.capitalText || m.capital != null) && <small>{[m.address, m.capitalText ? `資本金 ${m.capitalText}` : m.capital != null ? `資本金 ${m.capital}百万円` : ''].filter(Boolean).join('・')}</small>}</td>
                <td className="small nw">{m.relation}{m.note && /特定子会社/.test(m.note) && <small>特定子会社</small>}</td>
                <td className="small">{m.business}</td>
                <td className="c nw"><b>{voting(m)}</b></td>
                <td className="nw small">{m.since ? ym(m.since) : '—'}{m.source && <a href={m.source} target="_blank" rel="noreferrer" className="h-src">出典</a>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {g.note && <p className="muted small">{g.note}</p>}
      {unnamed > 0 && <p className="muted small">ほかに、有価証券報告書に名前の出ていない連結子会社が{unnamed}社あります。</p>}
      {g.former?.length ? (
        <>
          <h4 className="sub-h">以前の子会社（合併・売却など）</h4>
          <div className="earn-wrap">
            <table className="earn-table grp-table">
              <thead><tr><th>会社</th><th>内容</th><th>グループ入り</th><th>その後</th></tr></thead>
              <tbody>
                {g.former.map((m) => (
                  <tr key={m.name}>
                    <td><Name name={m.name} formerName={m.formerName} companyId={m.companyId} /></td>
                    <td className="small">{m.note}</td>
                    <td className="nw small">{m.since ? ym(m.since) : '—'}</td>
                    <td className="nw">{m.source && <a href={m.source} target="_blank" rel="noreferrer" className="h-src" style={{ marginRight: 6 }}>出典</a>}<span className={`exit-box ${/売却|譲渡|清算|解散/.test(m.how) ? 'ex-閉鎖' : 'ex-合併'}`}>{m.how}</span> <small>{m.end ? ym(m.end) : ''}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      <p className="muted small" style={{ marginTop: 8 }}>出典：<a href={g.source} target="_blank" rel="noreferrer">{g.sourceLabel}</a>（関係会社の状況・沿革・連結の範囲）。議決権の所有割合は有価証券報告書に書かれた値で、間接所有を含みます。</p>
    </section>
  );
}
