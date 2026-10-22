import Link from 'next/link';
import { ArticleCard } from '@/components/ArticleCard';
import { CompanyCard } from '@/components/CompanyCard';
import { NewsList } from '@/components/NewsList';
import { SectionHead } from '@/components/SectionHead';
import { NEWSLETTER_URL } from '@/components/Footer';
import { getArticles, getCategories, getCompanies, getFeaturedCompanies, getNews, getOverseas, getPeople, getServices, getWebinars } from '@/lib/data';

export default function Home() {
  const articles = getArticles();
  const featured = articles.filter((a) => a.featured).slice(0, 3);
  const latest = articles.slice(0, 6);
  const news = getNews().slice(0, 10);
  const cats = getCategories();
  const companies = getCompanies();
  const featuredCompanies = getFeaturedCompanies().slice(0, 8);
  const webinar = getWebinars().at(-1);

  return (
    <>
      <section className="hero">
        <div>
          <div className="kicker" style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.08em' }}>
            HEALTHCARE BUSINESS DATABASE
          </div>
          <h1>ヘルスケア領域に特化した事業DB</h1>
          <p className="lead">
            国内ヘルステック企業の事業・サービス・人物・ニュース・解説記事を一つにまとめました。
            「誰が、何を、どの市場でやっているか」を、カテゴリからたどって把握できます。
            もう車輪の再発明はいらない。
          </p>
          <div className="cta">
            <Link href="/companies/" className="btn primary">企業DBを見る</Link>
            <Link href="/categories/" className="btn">カテゴリから探す</Link>
            <Link href="/articles/about-healthtech-market-overview/" className="btn">ヘルステック入門</Link>
          </div>
        </div>
        <div className="stats">
          <div className="stat"><b className="mono">{companies.length}</b><span>国内企業</span></div>
          <div className="stat"><b className="mono">{getOverseas().length}</b><span>海外企業</span></div>
          <div className="stat"><b className="mono">{getServices().length}</b><span>サービス</span></div>
          <div className="stat"><b className="mono">{getPeople().length}</b><span>人物</span></div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section">
          <SectionHead title="特集" href="/articles/" />
          <div className="grid wide">
            {featured.map((a) => (
              <ArticleCard key={a.slug} a={a} />
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <SectionHead title="カテゴリから探す" href="/categories/" more="すべてのカテゴリ" />
        {(['disease', 'solution', 'domain'] as const).map((g) => (
          <div className="cat-group" key={g}>
            <h3>
              <span className={`dot ${g}`} />
              {cats.find((c) => c.group === g)?.groupLabel}
            </h3>
            <div className="chips">
              {cats.filter((c) => c.group === g).map((c) => (
                <Link key={c.slug} href={`/categories/${c.slug}/`} className={`chip ${c.group}`}>
                  {c.name}
                  <span className="muted mono" style={{ fontWeight: 500 }}>{companies.filter((x) => x.categories.includes(c.slug)).length}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="section">
        <SectionHead title="新着ニュース" href="/news/" />
        <NewsList items={news} empty="ニュースは配信パイプライン（pipeline/news.mjs）を実行すると表示されます。" />
      </section>

      {featuredCompanies.length > 0 && (
        <section className="section">
          <SectionHead title="注目企業" href="/companies/" more="企業一覧" />
          <div className="grid">
            {featuredCompanies.map((c) => (
              <CompanyCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <SectionHead title="新着記事" href="/articles/" />
        <div className="grid wide">
          {latest.map((a) => (
            <ArticleCard key={a.slug} a={a} />
          ))}
        </div>
      </section>

      <section className="section cta-box">
        <div>
          <h2>Healthtech DB マンスリーレビュー</h2>
          <p style={{ margin: '6px 0 0', opacity: 0.9 }}>
            毎月のヘルスケア業界ニュースを専門家が解説するランチタイムウェビナー。{webinar ? `これまでに ${webinar.vol ?? ''} 回開催。` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/webinars/" className="btn">開催履歴</Link>
          <a href={NEWSLETTER_URL} target="_blank" rel="noreferrer" className="btn">メルマガ登録</a>
        </div>
      </section>
    </>
  );
}
