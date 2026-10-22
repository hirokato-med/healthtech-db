import type { Metadata } from 'next';
import Link from 'next/link';
import { getCategories, getCompanies, getServices } from '@/lib/data';

export const metadata: Metadata = { title: 'カテゴリ一覧', description: '疾患・ソリューション・事業領域の3軸でヘルスケアビジネスを分類したカテゴリ一覧。' };

export default function CategoriesPage() {
  const cats = getCategories();
  const companies = getCompanies();
  const services = getServices();
  return (
    <>
      <div className="page-head">
        <div className="kicker">カテゴリ</div>
        <h1>カテゴリ一覧</h1>
        <p className="lead">ヘルスケアビジネスを「疾患」「ソリューション」「事業領域」の3軸で分類しています。1社が複数のカテゴリに属することもあります。</p>
      </div>
      <div className="cat-cols" style={{ marginTop: 8 }}>
        {(['disease', 'solution', 'domain'] as const).map((g) => (
          <div className="cat-col" key={g}>
            <h3>{cats.find((c) => c.group === g)?.groupLabel}</h3>
            {cats.filter((c) => c.group === g).map((c) => {
              const nC = companies.filter((x) => x.categories.includes(c.slug)).length;
              const nS = services.filter((x) => x.category === c.slug).length;
              return (
                <Link key={c.slug} href={`/categories/${c.slug}/`} className="cat-link">
                  {c.name}<span className="n">企業 {nC} ・ サービス {nS}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
