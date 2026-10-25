import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { categoryName, getCompany, getInvestor, getInvestors } from '@/lib/data';
import { YEARS, activity } from '@/lib/investors';
import { ymJa } from '@/lib/funding';

export function generateStaticParams() {
  return getInvestors().filter((i) => i.companies >= 2).map((i) => ({ id: i.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const i = getInvestor((await params).id);
  return { title: i ? `${i.name}のヘルスケア投資` : '投資家', description: i ? `${i.name}が出資したヘルスケア企業${i.companies}社と、出資の時期。` : undefined };
}

const short = (n = '') => n.replace(/^株式会社|株式会社$/g, '').replace(/（.*$/, '');
const money = (v: number | null) => (v == null ? '非公表' : v >= 100 ? `${(v / 100).toFixed(v >= 1000 ? 0 : 1)}億円` : `${v}百万円`);

/** 投資家ごとのページ：どのヘルスケア企業に、いつ出資したか。出資の年ごとの数と、いつから・いつまでか */
export default async function InvestorPage({ params }: { params: Promise<{ id: string }> }) {
  const i = getInvestor((await params).id);
  if (!i) notFound();
  const a = activity(i);
  const max = Math.max(1, ...YEARS.map((y) => a.byYear.get(y) ?? 0));
  // 同じ回のほかの投資家の名前から、その投資家のページへ（2社以上に出資していてページがあるもの）
  const ikey = (s: string) => s.normalize('NFKC').replace(/株式会社|合同会社|有限会社|[\s・･.,、]/g, '').toLowerCase();
  const pageOf = new Map(getInvestors().filter((x) => x.companies >= 2).map((x) => [ikey(x.name), x.id]));
  // 出資1回ごとに1行（新しい順）。金額は発表に書かれたもの
  const rows = [...i.rounds].reverse().map((r) => ({ r, c: getCompany(r.companyId) }));
  // 同じ回に出資したことの多い投資家
  const key = (r: { companyId: string; date: string }) => r.companyId + r.date;
  const mine = new Set(i.rounds.map(key));
  const co = getInvestors().filter((x) => x.id !== i.id).map((x) => ({ x, n: x.rounds.filter((r) => mine.has(key(r))).length })).filter((e) => e.n >= 2).sort((p, q) => q.n - p.n).slice(0, 10);
  const funds = i.aliases.filter((n) => /号|組合|ファンド|Fund/i.test(n));
  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">トップ</Link> / <Link href="/investors/">投資家</Link> / <span>{i.name}</span></nav>
      <div className="page-head">
        <div className="kicker">Investor</div>
        <h1>{i.name}</h1>
        <div className="chips" style={{ marginTop: 10 }}><span className="chip">{i.type}</span><span className={`inv-tone ${a.tone}`}>{a.label}</span></div>
        <p className="lead">このデータベースのヘルスケア企業のうち{i.companies}社に、{a.first}年から{a.last}年までに{i.rounds.length}回出資した記録があります{a.leads ? `（うちリード ${a.leads}回）` : ''}。</p>
      </div>
      <section className="bt-kpi">
        <div><span>投資先</span><b>{i.companies}社</b></div>
        <div><span>出資の回数</span><b>{i.rounds.length}回</b><small>{a.leads ? `リード ${a.leads}回` : ''}</small></div>
        <div><span>最初の出資</span><b>{a.first}年</b></div>
        <div><span>最近の出資</span><b>{ymJa(i.rounds.at(-1)?.date)}</b></div>
      </section>

      <section className="ma-sec">
        <h2>年ごとの出資の回数</h2>
        <div className="inv-years" role="img" aria-label={YEARS.map((y) => `${y}年 ${a.byYear.get(y) ?? 0}回`).join('、')}>
          {YEARS.map((y) => {
            const v = a.byYear.get(y) ?? 0;
            return (
              <div key={y} title={`${y}年 ${v}回`}>
                <span className="v">{v || ''}</span>
                <i style={{ height: `${v ? 6 + (v / max) * 110 : 2}px` }} className={v ? '' : 'z'} />
                <span className="y">{String(y).slice(2)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="ma-sec">
        <h2>出資したヘルスケア企業</h2>
        <div className="earn-wrap">
          <table className="earn-table inv-port">
            <colgroup><col style={{ width: '13em' }} /><col style={{ width: '7.5em' }} /><col style={{ width: '7.5em' }} /><col style={{ width: '7.5em' }} /><col style={{ width: '10em' }} /><col /></colgroup>
            <thead><tr><th>会社</th><th>領域</th><th>出資した月</th><th className="c">その回の調達総額</th><th>ラウンド</th><th>同じ回のほかの投資家</th></tr></thead>
            <tbody>
              {rows.map(({ r, c }) => (
                <tr key={r.companyId + r.date + (r.round ?? '')}>
                  <td>{c ? <Link href={`/companies/${r.companyId}/`}>{short(c.name)}</Link> : r.companyId}{c?.exit && c.exit !== '未上場' ? <small> {c.exit}</small> : null}</td>
                  <td className="small">{c?.categories?.[0] ? categoryName(c.categories[0]) : ''}</td>
                  <td className="nw">{ymJa(r.date)}</td>
                  <td className="c nw">{money(r.amount)}</td>
                  <td>{r.round ?? <span className="muted">—</span>}{r.lead && <em className="inv-lead">リード</em>}</td>
                  <td className="inv-with">{(r.with ?? []).length ? (r.with ?? []).map((n, k) => <span key={n}>{k > 0 && '、'}{pageOf.get(ikey(n)) ? <Link href={`/investors/${pageOf.get(ikey(n))}/`}>{n}</Link> : n}</span>) : <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {co.length > 0 && (
        <section className="ma-sec">
          <h2>同じ回に出資することが多い投資家</h2>
          <div className="tx-nav">{co.map(({ x, n }) => <Link key={x.id} href={x.companies >= 2 ? `/investors/${x.id}/` : '#'}>{x.name}<span>{n}回</span></Link>)}</div>
        </section>
      )}
      {funds.length > 0 && <p className="muted small">まとめたファンド名：{funds.join('、')}</p>}
      <p className="muted small">出典：各社の資金調達の発表。このデータベースに載っている会社への出資だけを数えています。調達総額はその回に集めた額の合計で、この投資家が出した額ではありません。</p>
    </>
  );
}
