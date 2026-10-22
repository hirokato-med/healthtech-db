import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleCard } from '@/components/ArticleCard';
import { CompanyCard } from '@/components/CompanyCard';
import { NewsList } from '@/components/NewsList';
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
    <>
      <nav className="breadcrumb" aria-label="パンくず">
        <Link href="/">トップ</Link> / <Link href="/categories/">カテゴリ</Link> / <span>{c.name}</span>
      </nav>
      <div className="page-head">
        <div className="kicker">{c.groupLabel}</div>
        <h1><span className={`chip ${c.group}`} style={{ fontSize: '1rem', padding: '4px 14px' }}>{c.name}</span></h1>
        <p className="lead">企業 {companies.length} 社 / サービス {services.length} 件 / 記事 {articles.length} 本</p>
      </div>
      {articles.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>記事</h2></div>
          <div className="grid wide">{articles.map((a) => <ArticleCard key={a.slug} a={a} />)}</div>
        </section>
      )}
      <section className="section">
        <div className="section-head"><h2>企業</h2></div>
        {companies.length ? <div className="grid">{companies.map((x) => <CompanyCard key={x.id} c={x} />)}</div> : <p className="muted">このカテゴリに登録された企業はまだありません。</p>}
      </section>
      {services.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>サービス・事業</h2></div>
          <div className="list">
            {services.map((s) => (
              <div className="row" key={s.id} style={{ gridTemplateColumns: '1fr' }}>
                <div>
                  <Link href={`/services/${s.id}/`}>{s.name}</Link>
                  <div className="sub">{s.companyId ? <Link href={`/companies/${s.companyId}/`}>{s.company}</Link> : <span>{s.company}</span>}{s.startedYear && <span>{s.startedYear}年開始</span>}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="section">
        <div className="section-head"><h2>ニュース</h2><Link className="more" href="/news/">すべてのニュース →</Link></div>
        <NewsList items={news} empty="このカテゴリのニュースはまだありません。" />
      </section>
    </>
  );
}
