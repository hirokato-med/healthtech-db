import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CategoryChip } from '@/components/Chip';
import { CompanyCard } from '@/components/CompanyCard';
import { ArticleCard } from '@/components/ArticleCard';
import { SectionHead } from '@/components/SectionHead';
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
    <div className="narrow">
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">トップ</Link>›<Link href="/articles/">記事</Link></nav>
      <header style={{ paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
        <div className="labels">{a.category && <CategoryChip slug={a.category} />}{a.tags?.map((t) => <span key={t} className="tag">#{t}</span>)}</div>
        <h1 style={{ marginTop: 8 }}>{a.title}</h1>
        <div className="small muted" style={{ marginTop: 8 }}>{a.author}・{fmtDate(a.date)}</div>
        {a.summary && <div className="quote" style={{ marginTop: 14 }}><span className="who">この記事のポイント</span><p style={{ WebkitLineClamp: 'unset' }}>{a.summary}</p></div>}
      </header>
      <article className="prose" dangerouslySetInnerHTML={{ __html: a.html }} />
      {companies.length > 0 && (
        <section className="section" style={{ marginTop: 32 }}>
          <SectionHead title="この記事で紹介している企業" count={`${companies.length}社`} />
          <div className="rows">{companies.map((c) => <CompanyCard key={c.id} c={c} />)}</div>
        </section>
      )}
      {others.length > 0 && (
        <section className="section">
          <SectionHead title="関連記事" href="/articles/" more="記事一覧" />
          <div className="rows">{others.map((x) => <ArticleCard key={x.slug} a={x} />)}</div>
        </section>
      )}
    </div>
  );
}
