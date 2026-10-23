import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EarningsBars } from '@/components/EarningsBars';
import { EarningsSummary } from '@/components/EarningsSummary';
import { getCompanies, getCompany, getDisclosures, getEarnings } from '@/lib/data';
import { forecastLabel, forecastOf, margin, money, pct, yoy } from '@/lib/earnings';
import type { EarningsReport, Figures } from '@/lib/types';

export function generateStaticParams() {
  return getCompanies().filter((c) => c.securitiesCode).map((c) => ({ id: c.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const c = getCompany((await params).id);
  return { title: c ? `${c.name}の決算` : '決算', description: c ? `${c.name}（${c.securitiesCode}）の決算：売上高・営業利益の推移、決算短信、適時開示。` : undefined };
}

const short = (fy: string) => fy.replace(/^(\d{4})年(\d{1,2})月期$/, (_, y, m) => `${y.slice(2)}/${m}期`);

export default async function CompanyEarningsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getCompany(id);
  if (!c || !c.securitiesCode) notFound();
  const reports = getEarnings()[c.id] ?? [];
  const disclosures = getDisclosures().filter((d) => d.companyId === c.id);
  const latest = reports[0];
  const f = forecastOf(latest);

  // 通期の推移：通期決算の「当期」と「前期」から決算期ごとの数字を組み立てる
  const fyMap = new Map<string, Figures>();
  const prevFy = (fy: string) => fy.replace(/^(\d{4})/, (y) => String(Number(y) - 1));
  for (const r of [...reports].reverse()) {
    if (r.quarter !== 'FY') continue;
    if (r.prior && !fyMap.has(prevFy(r.fiscalYear))) fyMap.set(prevFy(r.fiscalYear), r.prior);
    if (r.current) fyMap.set(r.fiscalYear, r.current);
  }
  // 次期の会社予想も1本だけ足す（「予」と付ける）
  const fyRows = [...fyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const lastFy = reports.find((r) => r.quarter === 'FY');
  const fcPoint = lastFy?.nextForecast ? [{ label: `${short(lastFy.fiscalYear.replace(/^(\d{4})/, (y) => String(Number(y) + 1)))}予`, fig: lastFy.nextForecast }] : [];
  const series: { label: string; fig: Figures; est?: boolean }[] = [...fyRows.map(([fy, fig]) => ({ label: short(fy), fig })), ...fcPoint.map((x) => ({ ...x, est: true }))];
  // 四半期（累計）の前年同期比較
  const latestQ: EarningsReport | undefined = reports.find((r) => r.quarter !== 'FY');
  // 同じ決算期の一つ前の決算（または前期の通期決算）で出ていた予想を「前回予想」にする
  const prevFc = (() => {
    if (!latest) return undefined;
    const target = latest.quarter === 'FY' ? undefined : latest.fiscalYear;
    if (!target) return undefined;
    const before = reports.slice(1).find((r) => (r.quarter !== 'FY' && r.fiscalYear === target && r.forecast) || (r.quarter === 'FY' && r.nextForecast && r.fiscalYear.replace(/^(\d{4})/, (y) => String(Number(y) + 1)) === target));
    const fig = before ? (before.quarter === 'FY' ? before.nextForecast : before.forecast) : undefined;
    return before && fig ? { label: `${before.date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, d) => `${y}年${Number(m)}月${Number(d)}日`)}公表の予想`, fig } : undefined;
  })();
  const docs = disclosures.filter((d) => ['決算短信', '決算説明資料', '業績予想・配当'].includes(d.kind));

  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">トップ</Link> / <Link href="/earnings/">決算</Link> / <span>{c.name}</span></nav>
      <div className="page-head">
        <div className="kicker">Earnings</div>
        <h1>{c.name}の決算</h1>
        <p className="lead">{c.listedMarket}・証券コード {c.securitiesCode}{c.industry33 ? `・${c.industry33}` : ''}　<Link href={`/companies/${c.id}/`} className="arrow">企業ページ</Link></p>
      </div>

      {latest ? (
        <>
          <section className="ma-sec" style={{ marginTop: 0 }}>
            <h2>決算の概要</h2>
            <EarningsSummary r={latest} prevForecast={prevFc} />
          </section>

          <section className="earn-kpi">
            <div><span>直近の決算</span><b>{latest.label.replace(/（中間期）/, '')}</b><small>{latest.date.replace(/-/g, '/')} 発表{latest.consolidated === false ? '・個別' : ''}</small></div>
            <div><span>売上高{latest.quarter !== 'FY' ? '（累計）' : ''}</span><b>{money(latest.current?.revenue)}</b><small>前年同期比 {pct(yoy(latest.current?.revenue, latest.prior?.revenue))}</small></div>
            <div><span>営業利益{latest.quarter !== 'FY' ? '（累計）' : ''}</span><b className={(latest.current?.operatingIncome ?? 0) < 0 ? 'down' : ''}>{money(latest.current?.operatingIncome)}</b><small>営業利益率 {pct(margin(latest.current), false)}・前年 {money(latest.prior?.operatingIncome)}</small></div>
            <div><span>{forecastLabel(latest) || '会社予想'}</span><b>{f ? money(f.revenue) : '—'}</b><small>{f ? `営業利益 ${money(f.operatingIncome)}` : '予想の開示なし'}</small></div>
          </section>

          {series.length >= 2 ? (
            <section className="earn-charts">
              <EarningsBars title="売上高の推移（通期）" color="#123e7c" points={series.map((s) => ({ label: s.label, value: s.fig.revenue, est: s.est }))} />
              <EarningsBars title="営業利益の推移（通期）" color="#0e7c86" points={series.map((s) => ({ label: s.label, value: s.fig.operatingIncome, est: s.est }))} />
            </section>
          ) : latestQ ? (
            <section className="earn-charts">
              <EarningsBars title={`売上高（${latestQ.label.replace(/^.*?期 /, '').replace(/（中間期）/, '')}累計の前年比較）`} color="#123e7c" points={[{ label: '前年同期', value: latestQ.prior?.revenue }, { label: '当期', value: latestQ.current?.revenue }]} />
              <EarningsBars title="営業利益（同）" color="#0e7c86" points={[{ label: '前年同期', value: latestQ.prior?.operatingIncome }, { label: '当期', value: latestQ.current?.operatingIncome }]} />
            </section>
          ) : null}
          {fcPoint.length > 0 && series.length >= 2 && <p className="muted small">右端の点線の棒（「予」）は会社の次期予想です。</p>}

          <section className="ma-sec">
            <h2>決算期ごとの数字</h2>
            <div className="earn-wrap">
              <table className="earn-table">
                <thead><tr><th>決算期</th><th>売上高</th><th>前年比</th><th>営業利益</th><th>営業利益率</th><th>経常利益</th><th>純利益</th><th>会社予想（売上高／営業利益）</th><th>資料</th></tr></thead>
                <tbody>
                  {reports.map((r) => {
                    const g = yoy(r.current?.revenue, r.prior?.revenue), ff = forecastOf(r);
                    return (
                      <tr key={r.date + r.label}>
                        <td className="nw">{r.label.replace(/（中間期）/, '')}<small>{r.date.replace(/-/g, '/')} 発表{r.consolidated === false ? '・個別' : ''}</small></td>
                        <td className="num">{money(r.current?.revenue)}</td>
                        <td className={`num ${g == null ? '' : g >= 0 ? 'up' : 'down'}`}>{pct(g)}</td>
                        <td className={`num ${(r.current?.operatingIncome ?? 0) < 0 ? 'down' : ''}`}>{money(r.current?.operatingIncome)}</td>
                        <td className="num">{pct(margin(r.current), false)}</td>
                        <td className="num">{money(r.current?.ordinaryIncome)}</td>
                        <td className={`num ${(r.current?.netIncome ?? 0) < 0 ? 'down' : ''}`}>{money(r.current?.netIncome)}</td>
                        <td className="num fc">{ff ? <>{money(ff.revenue)}／{money(ff.operatingIncome)}<small>{forecastLabel(r)}</small></> : '—'}</td>
                        <td className="nw">{r.pdf ? <a href={r.pdf} target="_blank" rel="noreferrer">決算短信</a> : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="muted small" style={{ marginTop: 6 }}>四半期は期初からの累計。経常利益は IFRS の会社では税引前利益。前年比は前年同期が黒字のときだけ出しています。</p>
          </section>
        </>
      ) : (
        <p className="notice">決算の数字は集計中です。次の決算発表から自動で入ります。</p>
      )}

      {docs.length > 0 && (
        <section className="ma-sec">
          <h2>決算資料</h2>
          <ul className="disc-list compact">
            {docs.map((d) => <li key={d.pdf}><span className="d">{d.date.replace(/-/g, '/')}</span><span className={`badge k-${d.kind}`}>{d.kind}</span><a href={d.pdf} target="_blank" rel="noreferrer" className="t">{d.title}</a></li>)}
          </ul>
        </section>
      )}

      <section className="ma-sec">
        <h2>適時開示</h2>
        {disclosures.length ? (
          <ul className="disc-list compact">
            {disclosures.map((d) => <li key={d.pdf}><span className="d">{d.date.replace(/-/g, '/')} {d.time}</span><span className={`badge k-${d.kind}`}>{d.kind}</span><a href={d.pdf} target="_blank" rel="noreferrer" className="t">{d.title}</a></li>)}
          </ul>
        ) : (
          <p className="muted small">まだ取り込んだ開示はありません（TDnet から毎日取り込みます）。</p>
        )}
        <p className="muted small" style={{ marginTop: 10 }}>出典：日本取引所グループ「適時開示情報閲覧サービス（TDnet）」、{c.name}の決算短信。正確な内容は原文をご確認ください。</p>
      </section>
    </>
  );
}
