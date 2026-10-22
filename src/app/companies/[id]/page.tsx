import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Chips } from '@/components/Chip';
import { CompanyCard } from '@/components/CompanyCard';
import { NewsList } from '@/components/NewsList';
import { CORRECTION_FORM_URL } from '@/components/Footer';
import { categoryName, findCompanyByName, getArticles, getCompanies, getCompany, newsOf, peopleOf, servicesOf } from '@/lib/data';

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
  const related = getCompanies().filter((x) => x.id !== c.id && x.categories.some((s) => c.categories.includes(s))).slice(0, 6);
  const parent = c.parentCompany ? findCompanyByName(c.parentCompany) : undefined;
  const articles = getArticles().filter((a) => a.companies?.some((n) => findCompanyByName(n)?.id === c.id));

  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず">
        <Link href="/">トップ</Link> / <Link href="/companies/">企業</Link> / <span>{c.name}</span>
      </nav>
      <div className="page-head">
        <div className="kicker">Company</div>
        <h1>{c.name}</h1>
        <div style={{ marginTop: 10 }}>
          <Chips slugs={c.categories} />
        </div>
        {c.description && <p className="lead">{c.description}</p>}
      </div>

      <div className="two-col">
        <div style={{ display: 'grid', gap: 20 }}>
          <section className="panel">
            <h3>提供サービス・事業</h3>
            {services.length ? (
              <div className="grid">
                {services.map((s) => (
                  <article className="card" key={s.id}>
                    <Link href={`/services/${s.id}/`} className="title">{s.name}</Link>
                    <div className="chips"><Link href={`/categories/${s.category}/`} className="chip">{categoryName(s.category)}</Link></div>
                    <p className="desc">{s.description}</p>
                    <div className="meta">{s.startedYear && <span>{s.startedYear}年開始</span>}<span className="badge">{s.status}</span></div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted small">サービス情報は未登録です。<a href={CORRECTION_FORM_URL} target="_blank" rel="noreferrer">情報提供フォーム</a>からお知らせください。</p>
            )}
          </section>

          <section className="panel">
            <h3>関連ニュース</h3>
            <NewsList items={news} empty="この企業に紐づくニュースはまだありません。" />
          </section>

          {articles.length > 0 && (
            <section className="panel">
              <h3>この企業を紹介している記事</h3>
              <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
                {articles.map((a) => (
                  <li key={a.slug}><Link href={`/articles/${a.slug}/`}>{a.title}</Link></li>
                ))}
              </ul>
            </section>
          )}

          {related.length > 0 && (
            <section>
              <h2 style={{ marginBottom: 12 }}>同じカテゴリの企業</h2>
              <div className="grid">
                {related.map((x) => (
                  <CompanyCard key={x.id} c={x} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside style={{ display: 'grid', gap: 16 }}>
          <section className="panel">
            <h3>企業情報</h3>
            <dl className="kv">
              {c.hp && (<><dt>Webサイト</dt><dd><a href={c.hp} target="_blank" rel="noreferrer">{c.hp.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a></dd></>)}
              <dt>上場区分</dt><dd><span className={`badge ${c.exit === '上場' ? 'listed' : ''}`}>{c.exit}</span></dd>
              {c.foundedYear && (<><dt>創業</dt><dd>{c.foundedYear}年</dd></>)}
              {c.prefecture && (<><dt>所在地</dt><dd>{c.prefecture}</dd></>)}
              {c.address && (<><dt>本社住所</dt><dd>{c.address}</dd></>)}
              {c.employees && (<><dt>従業員数</dt><dd>{c.employees}人</dd></>)}
              {c.founders.length > 0 && (<><dt>創業者</dt><dd>{c.founders.map((n, i) => { const p = people.find((x) => x.name === n); return (<span key={n}>{i > 0 && '、'}{p ? <Link href={`/talents/${p.id}/`}>{n}</Link> : n}</span>); })}</dd></>)}
              {c.representatives.length > 0 && (<><dt>代表者</dt><dd>{c.representatives.map((n, i) => { const p = people.find((x) => x.name === n); return (<span key={n}>{i > 0 && '、'}{p ? <Link href={`/talents/${p.id}/`}>{n}</Link> : n}</span>); })}</dd></>)}
              {c.parentCompany && (<><dt>親会社</dt><dd>{parent ? <Link href={`/companies/${parent.id}/`}>{c.parentCompany}</Link> : c.parentCompany}</dd></>)}
              {c.relatedCompanies.length > 0 && (<><dt>関連会社</dt><dd>{c.relatedCompanies.map((n, i) => { const r = findCompanyByName(n); return (<span key={n}>{i > 0 && '、'}{r && r.id !== c.id ? <Link href={`/companies/${r.id}/`}>{n}</Link> : n}</span>); })}</dd></>)}
              {c.corporateNumber && (<><dt>法人番号</dt><dd className="mono"><a href={c.corporateNumberUrl || `https://www.houjin-bangou.nta.go.jp/henkorireki-johoto.html?selHouzinNo=${c.corporateNumber}`} target="_blank" rel="noreferrer">{c.corporateNumber}</a></dd></>)}
            </dl>
          </section>
          <section className="notice">
            掲載情報に誤りや更新がある場合は、<a href={CORRECTION_FORM_URL} target="_blank" rel="noreferrer">情報修正を依頼する</a>からお知らせください。
            <div className="muted small" style={{ marginTop: 6 }}>出典: {c.source}</div>
          </section>
        </aside>
      </div>
    </>
  );
}
