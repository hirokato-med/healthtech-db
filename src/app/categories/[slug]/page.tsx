import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleCard } from '@/components/ArticleCard';
import { CompanyCard } from '@/components/CompanyCard';
import { NewsList } from '@/components/NewsList';
import { SectionHead } from '@/components/SectionHead';
import { articlesIn, companiesIn, getCategories, getCategory, getNews, servicesIn } from '@/lib/data';

export function generateStaticParams() {
  return getCategories().map((c) => ({ slug: c.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = getCategory((await params).slug);
  return { title: c ? `${c.name} の企業・サービス・記事` : 'カテゴリ', description: c ? `${c.name}（${c.groupLabel}）に属する国内ヘルステック企業、サービス、ニュース、解説記事。` : undefined };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = getCategory((await params).slug);
  if (!c) notFound();
  const companies = companiesIn(c.slug);
  const services = servicesIn(c.slug);
  const articles = articlesIn(c.slug);
  const news = getNews().filter((n) => n.category === c.slug).slice(0, 10);
  return (
    <div className="narrow">
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">トップ</Link>›<Link href="/categories/">カテゴリ</Link>›<span>{c.name}</span></nav>
      <div className="page-head">
        <span className={`label ${c.group}`}>{c.groupLabel}</span>
        <h1>{c.name}</h1>
        <p className="lead">企業 {companies.length} 社 / サービス {services.length} 件 / 記事 {articles.length} 本 / ニュース {news.length} 本</p>
      </div>
      {articles.length > 0 && (
        <section className="section" style={{ marginTop: 20 }}>
          <SectionHead title="記事" count={`${articles.length}本`} />
          <div className="rows">{articles.map((a) => <ArticleCard key={a.slug} a={a} />)}</div>
        </section>
      )}
      <section className="section" style={{ marginTop: 20 }}>
        <SectionHead title="企業" count={`${companies.length}社`} />
        {companies.length ? <div className="rows">{companies.map((x) => <CompanyCard key={x.id} c={x} />)}</div> : <p className="muted small">このカテゴリに登録された企業はまだありません。</p>}
      </section>
      {services.length > 0 && (
        <section className="section">
          <SectionHead title="サービス・事業" count={`${services.length}件`} />
          <div className="rows">
            {services.map((s) => (
              <article className="item" key={s.id}>
                <div className="body">
                  <Link href={`/services/${s.id}/`} className="title">{s.name}</Link>
                  <div className="meta">{s.companyId ? <Link href={`/companies/${s.companyId}/`}>{s.company}</Link> : <span>{s.company}</span>}{s.startedYear && <span>{s.startedYear}年開始</span>}</div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <section className="section">
        <SectionHead title="ニュース" href="/news/" more="すべてのニュース" />
        <NewsList items={news} empty="このカテゴリのニュースはまだありません。" />
      </section>
    </div>
  );
}
