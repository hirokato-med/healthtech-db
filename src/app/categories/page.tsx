import type { Metadata } from 'next';
import Link from 'next/link';
import { getArticles, getCategories, getCompanies, getServices } from '@/lib/data';

export const metadata: Metadata = { title: 'カテゴリ一覧', description: '疾患・ソリューション・事業領域の3軸でヘルスケアビジネスを分類したカテゴリ一覧。' };

export default function CategoriesPage() {
  const cats = getCategories();
  const companies = getCompanies();
  const services = getServices();
  const articles = getArticles();
  return (
    <>
      <div className="page-head">
        <div className="kicker">Categories</div>
        <h1>カテゴリ一覧</h1>
        <p className="lead">ヘルスケアビジネスを「疾患」「ソリューション」「事業領域」の3軸で分類しています。1社が複数のカテゴリに属することもあります。</p>
      </div>
      {(['disease', 'solution', 'domain'] as const).map((g) => (
        <section className="section" key={g}>
          <div className="section-head"><h2>{cats.find((c) => c.group === g)?.groupLabel}</h2></div>
          <div className="grid">
            {cats.filter((c) => c.group === g).map((c) => {
              const nC = companies.filter((x) => x.categories.includes(c.slug)).length;
              const nS = services.filter((x) => x.category === c.slug).length;
              const nA = articles.filter((x) => x.category === c.slug).length;
              return (
                <article className="card" key={c.slug}>
                  <Link href={`/categories/${c.slug}/`} className="title"><span className={`chip ${c.group}`}>{c.name}</span></Link>
                  <div className="meta"><span>企業 {nC}</span><span>サービス {nS}</span><span>記事 {nA}</span></div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
