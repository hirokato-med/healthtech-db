import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Chips } from '@/components/Chip';
import { CompanyCard } from '@/components/CompanyCard';
import { NewsList } from '@/components/NewsList';
import { SectionHead } from '@/components/SectionHead';
import { Tile, initialOf } from '@/components/Tile';
import { CORRECTION_FORM_URL } from '@/components/Footer';
import { categoryName, findCompanyByName, getArticles, getCategory, getCompanies, getCompany, newsOf, peopleOf, servicesOf } from '@/lib/data';

export function generateStaticParams() {
  return getCompanies().map((c) => ({ id: c.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const c = getCompany((await params).id);
  return { title: c?.name ?? '企業', description: c?.description || `${c?.name} の企業情報・提供サービス・関連ニュース` };
}

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getCompany(id);
  if (!c) notFound();
  const services = servicesOf(c.id);
  const people = peopleOf(c.id);
  const news = newsOf(c).slice(0, 10);
  const related = getCompanies().filter((x) => x.id !== c.id && x.categories.some((s) => c.categories.includes(s))).slice(0, 5);
  const parent = c.parentCompany ? findCompanyByName(c.parentCompany) : undefined;
  const articles = getArticles().filter((a) => a.companies?.some((n) => findCompanyByName(n)?.id === c.id));
  const personLink = (n: string, i: number) => {
    const p = people.find((x) => x.name === n);
    return <span key={n}>{i > 0 && '、'}{p ? <Link href={`/talents/${p.id}/`}>{n}</Link> : n}</span>;
  };

  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">トップ</Link>›<Link href="/companies/">企業</Link>›<span>{c.name}</span></nav>
      <div className="page-head" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <Tile text={initialOf(c.name)} color={getCategory(c.categories[0] ?? '')?.color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Chips slugs={c.categories} />
          <h1>{c.name}</h1>
          {c.description && <p className="lead">{c.description}</p>}
          <div className="item" style={{ padding: '10px 0 0', border: 0 }}>
            <div className="meta" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className={`tag ${c.exit === '上場' ? 'listed' : ''}`}>{c.exit}</span>
              {c.foundedYear && <span className="tag">{c.foundedYear}年創業</span>}
              {c.prefecture && <span className="tag">{c.prefecture}</span>}
              {c.employees && <span className="tag">従業員 {c.employees}人</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="two-col" style={{ marginTop: 20 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <section className="side-box">
            <h3>企業情報</h3>
            <dl className="kv">
              {c.hp && (<><dt>Webサイト</dt><dd><a href={c.hp} target="_blank" rel="noreferrer">{c.hp.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a></dd></>)}
              <dt>上場区分</dt><dd>{c.exit}</dd>
              {c.foundedYear && (<><dt>創業</dt><dd>{c.foundedYear}年</dd></>)}
              {c.address && (<><dt>本社</dt><dd>{c.address}</dd></>)}
              {c.employees && (<><dt>従業員数</dt><dd>{c.employees}人</dd></>)}
              {c.founders.length > 0 && (<><dt>創業者</dt><dd>{c.founders.map(personLink)}</dd></>)}
              {c.representatives.length > 0 && (<><dt>代表者</dt><dd>{c.representatives.map(personLink)}</dd></>)}
              {c.parentCompany && (<><dt>親会社</dt><dd>{parent ? <Link href={`/companies/${parent.id}/`}>{c.parentCompany}</Link> : c.parentCompany}</dd></>)}
              {c.relatedCompanies.length > 0 && (<><dt>関連会社</dt><dd>{c.relatedCompanies.map((n, i) => { const r = findCompanyByName(n); return <span key={n}>{i > 0 && '、'}{r && r.id !== c.id ? <Link href={`/companies/${r.id}/`}>{n}</Link> : n}</span>; })}</dd></>)}
              {c.corporateNumber && (<><dt>法人番号</dt><dd className="mono"><a href={c.corporateNumberUrl || `https://www.houjin-bangou.nta.go.jp/henkorireki-johoto.html?selHouzinNo=${c.corporateNumber}`} target="_blank" rel="noreferrer">{c.corporateNumber}</a></dd></>)}
            </dl>
          </section>
          {c.hp && <a className="btn primary lg block" href={c.hp} target="_blank" rel="noreferrer">公式サイトを見る ↗</a>}
          <p className="notice" style={{ margin: 0 }}>
            掲載情報の誤りや更新は<a href={CORRECTION_FORM_URL} target="_blank" rel="noreferrer">情報修正を依頼する</a>からお知らせください。
            <span className="small" style={{ display: 'block', marginTop: 4 }}>出典: {c.source}</span>
          </p>
        </div>
        <div>
          <section className="section">
            <SectionHead title="提供サービス・事業" count={`${services.length}件`} />
            {services.length ? (
              <div className="rows">
                {services.map((s) => (
                  <article className="item" key={s.id}>
                    <div className="body">
                      <Link href={`/categories/${s.category}/`} className="label" style={{ color: getCategory(s.category)?.color }}>{categoryName(s.category)}</Link>
                      <Link href={`/services/${s.id}/`} className="title">{s.name}</Link>
                      <p className="desc">{s.description}</p>
                      <div className="meta">{s.startedYear && <span className="tag">{s.startedYear}年開始</span>}<span className="tag">{s.status}</span></div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="notice">サービス情報は未登録です。<a href={CORRECTION_FORM_URL} target="_blank" rel="noreferrer">情報提供フォーム</a>からお知らせください。</p>
            )}
          </section>

          <section className="section">
            <SectionHead title="関連ニュース" count={`${news.length}本`} />
            <NewsList items={news} empty="この企業に紐づくニュースはまだありません。" />
          </section>

          {articles.length > 0 && (
            <section className="section">
              <SectionHead title="この企業を紹介している記事" />
              <div className="rows">
                {articles.map((a) => (
                  <article className="item" key={a.slug}><div className="body"><Link href={`/articles/${a.slug}/`} className="title ink">{a.title}</Link></div></article>
                ))}
              </div>
            </section>
          )}

          {related.length > 0 && (
            <section className="section">
              <SectionHead title="同じカテゴリの企業" href={`/categories/${c.categories[0]}/`} more="カテゴリを見る" />
              <div className="rows">{related.map((x) => <CompanyCard key={x.id} c={x} />)}</div>
            </section>
          )}
        </div>

      </div>
    </>
  );
}
