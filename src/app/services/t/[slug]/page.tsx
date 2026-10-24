import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { END_REASONS, STOPPED, categoryName, getArticles, getBizType, getBizTypes, getThemes, servicesOfType } from '@/lib/data';
import { ym } from '@/lib/ym';

export function generateStaticParams() {
  return getBizTypes().map((t) => ({ slug: t.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const t = getBizType((await params).slug);
  return { title: t ? `${t.name}の事業（${categoryName(t.category)}）` : '事業の種類', description: t?.description };
}

const NOW = 2026 + 10 / 12;
const toY = (s?: string | null) => {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})(?:-(\d{2}))?/);
  return m ? Number(m[1]) + (m[2] ? (Number(m[2]) - 1) / 12 : 0) : null;
};
const short = (n: string) => n.replace(/^株式会社|株式会社$/g, '').replace(/（.*$/, '');

/** 事業の種類のページ：その種類の事業が、いつ始まり、いつ・なぜ止まったかを年表と表で見る */
export default async function BizTypePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = getBizType(slug);
  if (!t) notFound();
  const items = servicesOfType(slug)
    .map((s) => ({ s, a: toY(s.startedAt) ?? (s.startedYear ?? null), b: STOPPED.includes(s.status) ? ((e) => (e === null ? null : Math.min(NOW, e)))(toY(s.endedAt)) : NOW }))
    .sort((x, y) => (x.a ?? 9999) - (y.a ?? 9999));
  const dated = items.filter((x) => x.a !== null);
  const undated = items.filter((x) => x.a === null);
  const min = dated.length ? Math.floor(Math.min(...dated.map((x) => x.a as number))) : 2016;
  const from = Math.max(1990, (min - 1) - ((min - 1) % 2));
  const span = NOW - from;
  const pct = (y: number) => `${((Math.max(from, y) - from) / span) * 100}%`;
  const years = Array.from({ length: Math.floor(NOW) - from + 1 }, (_, i) => from + i).filter((y) => y % (span > 20 ? 4 : 2) === 0);
  const stopped = items.filter((x) => STOPPED.includes(x.s.status));
  const live = items.filter((x) => x.s.status === '提供中');
  const reasons = Object.entries(END_REASONS)
    .map(([k, r]) => ({ k, label: r.label, n: stopped.filter((x) => (x.s.endReasons ?? []).includes(k)).length }))
    .filter((r) => r.n && r.k !== 'unknown')
    .sort((a, b) => b.n - a.n);
  // 止まった事業の平均の続いた年数
  const lived = stopped.filter((x) => x.a !== null && x.b !== null).map((x) => (x.b as number) - (x.a as number));
  const avg = lived.length ? lived.reduce((p, v) => p + v, 0) / lived.length : null;
  const theme = t.theme ? getThemes().find((x) => x.slug === t.theme) : undefined;
  const articles = theme ? getArticles().filter((a) => theme.articles?.includes(a.slug)) : [];
  const siblings = getBizTypes().filter((x) => x.category === t.category && x.slug !== slug);

  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず">
        <Link href="/">トップ</Link> / <Link href="/services/">事業データベース</Link> / <Link href={`/services/c/${t.category}/`}>{categoryName(t.category)}</Link> / <span>{t.name}</span>
      </nav>
      <div className="page-head">
        <div className="kicker">Business type</div>
        <h1>{t.name}</h1>
        <p className="lead">{t.description}</p>
      </div>
      <section className="bt-kpi">
        <div><span>記録した事業</span><b>{items.length}件</b><small>{dated.length ? `${Math.floor(min)}年〜` : ''}</small></div>
        <div><span>いま提供中</span><b>{live.length}件</b></div>
        <div><span>止まった事業</span><b>{stopped.length}件</b><small>終了・譲渡・統合・休止</small></div>
        <div><span>止まった事業が続いた年数</span><b>{avg !== null ? `平均 ${avg.toFixed(1)}年` : '—'}</b><small>{lived.length ? `${lived.length}件の平均` : ''}</small></div>
      </section>
      {reasons.length > 0 && (
        <div className="bt-reasons"><b>止まった理由</b>{reasons.map((r) => <Link key={r.k} href={`/services/stopped/#${r.k}`} className="chip ghost">{r.label} {r.n}</Link>)}</div>
      )}
      {articles.map((a) => (
        <Link key={a.slug} href={`/articles/${a.slug}/`} className="learn-article" style={{ marginBottom: 20 }}><small>解説</small>{a.title}</Link>
      ))}

      {dated.length > 0 && (
        <section className="timeline-chart" aria-label="事業の開始と終了の年表">
          <div className="tc-axis">{years.map((y) => <span key={y} style={{ left: pct(y) }}>{y}</span>)}</div>
          {dated.map(({ s, a, b }) => (
            <div className="tc-row" key={s.id}>
              <Link href={`/services/${s.id}/`} className="tc-label">{s.name}<small>{short(s.company)}</small></Link>
              <div className="tc-track">
                {years.map((y) => <i key={y} className="tc-grid" style={{ left: pct(y) }} />)}
                <span className={`tc-bar st-${s.status}`} style={{ left: pct(a as number), width: `max(6px, calc(${pct(b ?? (a as number) + 0.5)} - ${pct(a as number)}))` }} title={`${ym(s.startedAt) || s.startedYear + '年'} 〜 ${STOPPED.includes(s.status) ? ym(s.endedAt) + ' ' + s.status : '提供中'}`} />
              </div>
            </div>
          ))}
          <div className="tc-legend"><span className="st-提供中">提供中</span><span className="st-終了">終了・休止</span><span className="st-統合">譲渡・統合</span></div>
        </section>
      )}

      {stopped.length > 0 && (
        <section className="ma-sec">
          <h2>止まった事業と、その理由</h2>
          <div className="earn-wrap">
            <table className="earn-table bt-stop">
              <thead><tr><th>事業</th><th>会社</th><th>期間</th><th>状態</th><th>止まった理由</th></tr></thead>
              <tbody>
                {stopped.map(({ s }) => (
                  <tr key={s.id}>
                    <td><Link href={`/services/${s.id}/`}>{s.name}</Link></td>
                    <td>{s.companyId ? <Link href={`/companies/${s.companyId}/`}>{short(s.company)}</Link> : short(s.company)}</td>
                    <td className="nw">{ym(s.startedAt) || (s.startedYear ? `${s.startedYear}年` : '')}〜{ym(s.endedAt)}</td>
                    <td><span className={`badge st-${s.status}`}>{s.status}</span></td>
                    <td>{(s.endReasons ?? []).filter((r) => r !== 'unknown').map((r) => <span key={r} className="chip ghost">{END_REASONS[r]?.label ?? r}</span>)}<small>{s.endReasonNote}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {undated.length > 0 && (
        <section className="ma-sec">
          <h2>開始時期を確認中の事業</h2>
          <p className="muted small">{undated.map(({ s }, i) => <span key={s.id}>{i > 0 && '、'}<Link href={`/services/${s.id}/`}>{s.name}</Link>（{short(s.company)}）</span>)}</p>
        </section>
      )}

      <section className="ma-sec">
        <h2>{categoryName(t.category)}のほかの事業の種類</h2>
        <div className="tx-nav">{siblings.map((x) => <Link key={x.slug} href={`/services/t/${x.slug}/`}>{x.name}<span>{servicesOfType(x.slug).length}</span></Link>)}</div>
      </section>
    </>
  );
}
