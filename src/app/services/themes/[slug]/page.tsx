import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { END_REASONS, STOPPED, getArticles, getThemes, servicesInTheme } from '@/lib/data';

export function generateStaticParams() {
  return getThemes().map((t) => ({ slug: t.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = getThemes().find((x) => x.slug === slug);
  return { title: t ? `${t.name}の歴代事業` : 'テーマ', description: t?.lead };
}

const NOW = 2026 + 10 / 12;
const toY = (s?: string | null) => {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})(?:-(\d{2}))?/);
  return m ? Number(m[1]) + (m[2] ? (Number(m[2]) - 1) / 12 : 0) : null;
};
const ym = (s?: string) => (s ? s.replace(/^(\d{4})-(\d{2}).*$/, (_, y, m) => `${y}年${Number(m)}月`).replace(/^(\d{4})$/, '$1年') : '');

export default async function ThemePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = getThemes().find((x) => x.slug === slug);
  if (!t) notFound();
  const items = servicesInTheme(slug)
    .map((s) => ({ s, a: toY(s.startedAt) ?? (s.startedYear ?? null), b: STOPPED.includes(s.status) ? toY(s.endedAt) : NOW }))
    .sort((x, y) => (x.a ?? 9999) - (y.a ?? 9999));
  const dated = items.filter((x) => x.a !== null);
  const min = dated.length ? Math.floor(Math.min(...dated.map((x) => x.a as number))) : 2016;
  const from = (min - 1) - ((min - 1) % 2);
  const span = NOW - from;
  const pct = (y: number) => `${((y - from) / span) * 100}%`;
  const years = Array.from({ length: Math.floor(NOW) - from + 1 }, (_, i) => from + i).filter((y) => y % 2 === 0);
  const stopped = items.filter((x) => STOPPED.includes(x.s.status));
  const reasons = Object.entries(END_REASONS)
    .map(([k, r]) => ({ k, label: r.label, n: stopped.filter((x) => (x.s.endReasons ?? []).includes(k)).length }))
    .filter((r) => r.n && r.k !== 'unknown')
    .sort((a, b) => b.n - a.n);

  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">トップ</Link> / <Link href="/services/">事業</Link> / <span>{t.name}</span></nav>
      <div className="page-head">
        <div className="kicker">Theme</div>
        <h1>{t.name}の歴代事業</h1>
        <p className="lead">{t.lead} 記録 {items.length} 件（うち止まった・統合された事業 {stopped.length} 件）。</p>
        {reasons.length > 0 && <div className="chips" style={{ marginTop: 10 }}>{reasons.map((r) => <span key={r.k} className="chip ghost">{r.label} {r.n}</span>)}</div>}
      </div>
      {getArticles().filter((a) => t.articles?.includes(a.slug)).map((a) => (
        <Link key={a.slug} href={`/articles/${a.slug}/`} className="learn-article" style={{ marginBottom: 20 }}><small>解説</small>{a.title}</Link>
      ))}

      <section className="timeline-chart" aria-label="事業の開始と終了の年表">
        <div className="tc-axis">{years.map((y) => <span key={y} style={{ left: pct(y) }}>{y}</span>)}</div>
        {items.map(({ s, a, b }) => (
          <div className="tc-row" key={s.id}>
            <Link href={`/services/${s.id}/`} className="tc-label">{s.name}<small>{s.company}</small></Link>
            <div className="tc-track">
              {years.map((y) => <i key={y} className="tc-grid" style={{ left: pct(y) }} />)}
              {a !== null && (
                <span className={`tc-bar st-${s.status}`} style={{ left: pct(a), width: `max(6px, calc(${pct(b ?? a + 0.5)} - ${pct(a)}))` }} title={`${ym(s.startedAt) || s.startedYear + '年'} 〜 ${STOPPED.includes(s.status) ? ym(s.endedAt) + ' ' + s.status : '提供中'}`} />
              )}
            </div>
          </div>
        ))}
        <div className="tc-legend"><span className="st-提供中">提供中</span><span className="st-終了">終了・休止</span><span className="st-統合">譲渡・統合</span></div>
      </section>
    </>
  );
}
