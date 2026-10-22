import Link from 'next/link';
import { ArticleCard, FeatureArticle } from '@/components/ArticleCard';
import { CompanyCard } from '@/components/CompanyCard';
import { NewsList } from '@/components/NewsList';
import { SectionHead } from '@/components/SectionHead';
import { SearchBar } from '@/components/SearchBox';
import { NEWSLETTER_URL } from '@/components/Footer';
import { getArticles, getCategories, getCompanies, getFeaturedCompanies, getNews, getWebinars } from '@/lib/data';

export default function Home() {
  const articles = getArticles();
  const feature = articles.find((a) => a.featured) ?? articles[0];
  const rest = articles.filter((a) => a.slug !== feature?.slug).slice(0, 4);
  const news = getNews();
  const todayNews = news.slice(0, 8);
  const cats = getCategories();
  const companies = getCompanies();
  const featuredCompanies = getFeaturedCompanies().slice(0, 6);
  const lastWebinar = getWebinars().at(-1);

  return (
    <div className="narrow">
      <section className="section">
        <h1 style={{ fontSize: 19, lineHeight: '27px', margin: '4px 0 12px' }}>ヘルスケアの「誰が・何を・どの市場で」を調べる</h1>
        <SearchBar />
      </section>

      {feature && (
        <section className="section">
          <SectionHead title="特集" count={`${articles.length}本`} />
          <FeatureArticle a={feature} />
          <div className="rows bare">{rest.map((a) => <ArticleCard key={a.slug} a={a} />)}</div>
          <a className="link-line" href={NEWSLETTER_URL} target="_blank" rel="noreferrer">加藤浩晃のメルマガを毎朝メールで受け取る ↗</a>
        </section>
      )}

      <section className="section">
        <SectionHead title="本日のニュース" href="/news/" more={`すべて ${news.length}本`} />
        <NewsList items={todayNews} empty="ニュースは配信パイプライン（pipeline/news.mjs）を実行すると表示されます。" />
      </section>

      <section className="section">
        <SectionHead title="カテゴリから探す" href="/categories/" more="すべてのカテゴリ" />
        <div className="cat-cols">
          {(['disease', 'solution', 'domain'] as const).map((g) => (
            <div className="cat-col" key={g}>
              <h3>{cats.find((c) => c.group === g)?.groupLabel}</h3>
              {cats
                .filter((c) => c.group === g)
                .map((c) => ({ c, n: companies.filter((x) => x.categories.includes(c.slug)).length }))
                .filter(({ n }) => n > 0)
                .sort((a, b) => b.n - a.n)
                .slice(0, 8)
                .map(({ c, n }) => (
                  <Link key={c.slug} href={`/categories/${c.slug}/`} className="cat-link" style={{ color: c.color }}>
                    {c.name}<span className="n">{n}社</span>
                  </Link>
                ))}
            </div>
          ))}
        </div>
      </section>

      {featuredCompanies.length > 0 && (
        <section className="section">
          <SectionHead title="注目企業" href="/companies/" more={`企業一覧 ${companies.length}社`} />
          <div className="rows">{featuredCompanies.map((c) => <CompanyCard key={c.id} c={c} />)}</div>
        </section>
      )}

      <section className="section">
        <SectionHead title="マンスリーレビュー" href="/webinars/" more="開催履歴" />
        <div className="notice" style={{ marginTop: 8 }}>
          毎月のヘルスケア業界ニュースを専門家2人で語り合うランチョンセミナー。{lastWebinar?.vol ? `2023年5月までに ${lastWebinar.vol} 回開催しました。` : ''}再開のご案内はメルマガでお知らせします。
        </div>
      </section>
    </div>
  );
}
