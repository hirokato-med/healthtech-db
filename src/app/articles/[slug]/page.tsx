import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CategoryChip } from '@/components/Chip';
import { CompanyCard } from '@/components/CompanyCard';
import { findCompanyByName, fmtDate, getArticle, getArticles } from '@/lib/data';
import type { Company } from '@/lib/types';

export function generateStaticParams() {
  return getArticles().map((a) => ({ slug: a.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = getArticle((await params).slug);
  return { title: a?.title ?? '記事', description: a?.summary };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = getArticle((await params).slug);
  if (!a) notFound();
  const companies = (a.companies ?? []).map((n) => findCompanyByName(n)).filter((c): c is Company => Boolean(c));
  const others = getArticles().filter((x) => x.slug !== a.slug).slice(0, 3);
  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず">
        <Link href="/">トップ</Link> / <Link href="/articles/">記事</Link> / <span>{a.title}</span>
      </nav>
      <div className="page-head">
        <div className="chips">{a.category && <CategoryChip slug={a.category} />}{a.tags?.map((t) => <span key={t} className="chip ghost">#{t}</span>)}</div>
        <h1 style={{ marginTop: 10 }}>{a.title}</h1>
        <div className="muted small" style={{ marginTop: 8 }}>{fmtDate(a.date)} ・ {a.author}</div>
        {a.summary && <p className="lead">{a.summary}</p>}
      </div>
      <article className="prose" dangerouslySetInnerHTML={{ __html: a.html }} />
      {companies.length > 0 && (
        <section className="section" style={{ marginTop: 28 }}>
          <div className="section-head"><h2>この記事で紹介している企業</h2></div>
          <div className="grid">{companies.map((c) => <CompanyCard key={c.id} c={c} />)}</div>
        </section>
      )}
      {others.length > 0 && (
        <section className="section" style={{ marginTop: 28 }}>
          <div className="section-head"><h2>関連記事</h2><Link className="more" href="/articles/">記事一覧 →</Link></div>
          <ul style={{ paddingLeft: '1.2em' }}>{others.map((x) => <li key={x.slug}><Link href={`/articles/${x.slug}/`}>{x.title}</Link></li>)}</ul>
        </section>
      )}
    </>
  );
}
