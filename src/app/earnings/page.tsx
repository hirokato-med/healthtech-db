import type { Metadata } from 'next';
import Link from 'next/link';
import { EarningsTable } from '@/components/EarningsTable';
import { getCategories, getCompanies, getDisclosures, getEarnings } from '@/lib/data';
import { type EarningsRow, change, healthcareOf, latestWithSegments, money, pct, yoy } from '@/lib/earnings';

export const metadata: Metadata = {
  title: '上場ヘルスケア企業の決算',
  description: '東証に上場するヘルスケア企業の決算（売上高・営業利益・前年比・会社予想）と、適時開示の新着。決算短信の数字を TDnet から毎日取り込んでいます。',
};

export default function EarningsPage() {
  const earnings = getEarnings();
  const listed = getCompanies().filter((c) => c.securitiesCode);
  const catName = Object.fromEntries(getCategories().map((c) => [c.slug, c.name]));
  const rows: EarningsRow[] = listed.map((c) => {
    const rs = earnings[c.id] ?? [];
    return { id: c.id, name: c.name, code: c.securitiesCode!, market: c.listedMarket ?? '', category: c.categories[0] ?? '', latest: rs[0], fy: rs.find((r) => r.quarter === 'FY'), major: c.major };
  });
  const recent = Object.entries(earnings)
    .flatMap(([id, rs]) => rs.map((r) => ({ id, r, name: listed.find((c) => c.id === id)?.name ?? '' })))
    .sort((a, b) => b.r.date.localeCompare(a.r.date))
    .slice(0, 12);
  const disclosures = getDisclosures().slice(0, 60);
  const withData = rows.filter((r) => r.latest).length;
  // 大手企業のヘルスケア事業（ヘルスケアに関わるセグメントだけを取り出す）
  const majorHc = listed
    .filter((c) => c.major)
    .map((c) => { const rs = earnings[c.id] ?? []; const r = rs.find((x) => x.quarter === 'FY' && x.segments?.length) ?? latestWithSegments(rs); const h = healthcareOf(r); return r && h && !h.whole && h.revenue != null ? { c, r, h } : undefined; })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .sort((a, b) => (b.h.revenue ?? 0) - (a.h.revenue ?? 0));

  return (
    <>
      <div className="page-head">
        <div className="kicker">Earnings</div>
        <h1>上場ヘルスケア企業の決算</h1>
        <p className="lead">
          東証に上場するヘルスケア企業 {listed.length} 社の決算をまとめています。決算短信の数字は TDnet（東証の適時開示）から毎日取り込み、
          売上高・営業利益・前年同期比・会社予想を一覧で比べられます。金額の単位は円（億円・百万円）です。
        </p>
        <nav className="reason-index" style={{ marginTop: 14 }}>
          <a href="#list">決算一覧<span>{withData}/{listed.length}社</span></a>
          {majorHc.length > 0 && <a href="#major-hc">大手のヘルスケア事業<span>{majorHc.length}</span></a>}
          <a href="#recent">直近の決算発表<span>{recent.length}</span></a>
          <a href="#disclosures">適時開示の新着<span>{disclosures.length}</span></a>
        </nav>
      </div>

      <section id="list" className="ma-sec">
        <h2>決算一覧</h2>
        <EarningsTable rows={rows} catName={catName} />
      </section>

      {majorHc.length > 0 && (
        <section id="major-hc" className="ma-sec">
          <h2>大手企業のヘルスケア事業</h2>
          <p className="muted small">事業の多い大手は、全社ではなくヘルスケアに関わるセグメントの数字を取り出しています（決算短信のセグメント情報。くらべやすいよう直近の通期で、四半期の数字は各社の決算ページにあります）。ヘルスケア単独のセグメントが無い会社（通信・商社など）は載せていません。</p>
          <div className="earn-wrap">
            <table className="earn-table">
              <thead><tr><th>会社</th><th>ヘルスケアに関わるセグメント</th><th>売上高</th><th>前年同期比</th><th>セグメント利益</th><th>全社売上に占める割合</th><th>決算期</th></tr></thead>
              <tbody>
                {majorHc.map(({ c, r, h }) => {
                  const g = change(h.revenue, h.priorRevenue);
                  return (
                    <tr key={c.id}>
                      <td className="ecomp"><Link href={`/earnings/${c.id}/`}>{c.name.replace(/^株式会社|株式会社$/g, '')}</Link><small>{c.securitiesCode}・{c.industry33}</small></td>
                      <td>{h.names.join('、')}</td>
                      <td className="num">{money(h.revenue)}</td>
                      <td className={`num ${g.tone}`}>{g.text}</td>
                      <td className={`num ${(h.profit ?? 0) < 0 ? 'down' : ''}`}>{money(h.profit)}</td>
                      <td className="num">{h.share != null ? <><span className="share-bar"><i style={{ width: `${Math.min(100, h.share)}%` }} /></span>{h.share.toFixed(1)}%</> : '—'}</td>
                      <td className="nw">{r.label.replace(/（中間期）/, '')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section id="recent" className="ma-sec">
          <h2>直近の決算発表</h2>
          <div className="earn-cards">
            {recent.map(({ id, r, name }) => {
              const g = yoy(r.current?.revenue, r.prior?.revenue);
              const og = r.current?.operatingIncome, op = r.prior?.operatingIncome;
              return (
                <article key={id + r.date} className="earn-card">
                  <div className="h"><Link href={`/earnings/${id}/`}>{name.replace(/^株式会社|株式会社$/g, '')}</Link><span>{r.date.replace(/-/g, '/')}</span></div>
                  <div className="p">{r.label}</div>
                  <dl>
                    <div><dt>売上高</dt><dd>{money(r.current?.revenue)}<small className={g == null ? '' : g >= 0 ? 'up' : 'down'}>{pct(g)}</small></dd></div>
                    <div><dt>営業利益</dt><dd className={(og ?? 0) < 0 ? 'down' : ''}>{money(og)}<small>{op != null ? `前年 ${money(op)}` : ''}</small></dd></div>
                  </dl>
                  {r.pdf && <a href={r.pdf} target="_blank" rel="noreferrer" className="arrow small">決算短信</a>}
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section id="disclosures" className="ma-sec">
        <h2>適時開示の新着</h2>
        <p className="muted small">掲載企業の適時開示（TDnet）。表題と日時だけを載せています。本文は各リンク先（PDF）で確認してください。</p>
        <ul className="disc-list">
          {disclosures.map((d) => (
            <li key={d.pdf}>
              <span className="d">{d.date.slice(5).replace('-', '/')} {d.time}</span>
              <span className={`badge k-${d.kind}`}>{d.kind}</span>
              <Link href={`/companies/${d.companyId}/`} className="c">{d.company.replace(/^株式会社|株式会社$/g, '')}</Link>
              <a href={d.pdf} target="_blank" rel="noreferrer" className="t">{d.title}</a>
            </li>
          ))}
        </ul>
        <p className="muted small" style={{ marginTop: 12 }}>出典：日本取引所グループ「適時開示情報閲覧サービス（TDnet）」、各社の決算短信。数字は決算短信のサマリー（XBRL）から取り込んでおり、正確な内容は原文をご確認ください。</p>
      </section>
    </>
  );
}
