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
  const empAsOf = c.employeesAsOf ? c.employeesAsOf.replace(/^(\d{4})-(\d{2})$/, (_, y, m) => `${y}年${Number(m)}月`) : c.source.includes('2021-09') ? '2021年' : '';
  const srcLabel = (u: string) => {
    const corp = u.match(/houjin-bangou\.nta\.go\.jp.*selHouzinNo=(\d{13})/)?.[1];
    if (corp) return `国税庁 法人番号公表サイト（${corp}）`;
    if (u.includes('nenkin.go.jp/do/search_section')) return '日本年金機構 適用事業所検索';
    return u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 48);
  };
  const ym = (s: string) => s.replace(/^(\d{4})-(\d{2})$/, (_, y, m) => `${y}年${Number(m)}月`).replace(/^(\d{4})$/, '$1年');
  const personLink = (n: string) => { const p = people.find((x) => x.name === n); return p ? <Link href={`/talents/${p.id}/`}>{n}</Link> : n; };
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
        {c.highlight && <p className="co-highlight"><b>注目</b>{c.highlight}</p>}
        {c.scopeNote && <p className="co-scope"><b>現在の事業</b>{c.scopeNote}</p>}
        {c.statusNote && <p className="co-scope warn"><b>注意</b>{c.statusNote}</p>}
      </div>

      <div className="two-col">
        <div style={{ display: 'grid', gap: 20 }}>
          {c.overview && (
            <section className="panel">
              <h3>事業概要</h3>
              <p className="co-overview">{c.overview}</p>
            </section>
          )}
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
            ) : c.products?.length ? (
              <div className="chips">{c.products.map((n) => <span key={n} className="chip">{n}</span>)}</div>
            ) : (
              <p className="muted small">サービス情報は未登録です。<a href={CORRECTION_FORM_URL} target="_blank" rel="noreferrer">情報提供フォーム</a>からお知らせください。</p>
            )}
          </section>

          {c.history?.length ? (
            <section className="panel">
              <h3>近況</h3>
              <ul className="co-history">
                {[...c.history].reverse().map((h) => (
                  <li key={h.text}><span>{h.date ? h.date.replace(/^(\d{4})-(\d{2}).*/, (_, y, m) => `${y}年${Number(m)}月`) : ''}</span>{h.text}</li>
                ))}
              </ul>
            </section>
          ) : null}

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
              <dt>上場区分</dt><dd><span className={`badge ${c.exit === '上場' ? 'listed' : c.exit === '閉鎖' ? 'closed' : ''}`}>{c.exit}</span>{c.listedMarket && <span className="small muted"> {c.listedMarket}</span>}</dd>
              {c.formerNames?.length ? (<><dt>旧社名</dt><dd>{c.formerNames.join('、')}</dd></>) : null}
              {c.foundedYear && (<><dt>創業</dt><dd>{c.foundedYear}年</dd></>)}
              {c.prefecture && (<><dt>所在地</dt><dd>{c.prefecture}</dd></>)}
              {c.address && (<><dt>本社住所</dt><dd>{c.address}</dd></>)}
              {c.employees && (<><dt>従業員数</dt><dd>{c.employeesAsOf ? c.employees : `${c.employees}人`}{empAsOf && <span className="small muted">（{empAsOf}時点）</span>}</dd></>)}
              {c.totalFunding && (<><dt>資金調達</dt><dd>{c.totalFunding}</dd></>)}
              {c.founders.length > 0 && (<><dt>創業者</dt><dd>{c.founders.map((n, i) => { const p = people.find((x) => x.name === n); return (<span key={n}>{i > 0 && '、'}{p ? <Link href={`/talents/${p.id}/`}>{n}</Link> : n}</span>); })}</dd></>)}
              {c.representatives.length > 0 && (<><dt>代表者</dt><dd>{c.representatives.map((n, i) => <span key={n}>{i > 0 && '、'}{personLink(n)}</span>)}
                {c.formerRepresentatives?.length ? (
                  <div className="rep-line" aria-label="歴代の代表者">
                    {c.formerRepresentatives.map((f) => (
                      <span key={f.name}>{personLink(f.name)}{f.until && <small>（〜{ym(f.until)}）</small>}<i aria-hidden="true">→</i></span>
                    ))}
                    <span className="now">{c.representatives.map((n, i) => <span key={n}>{i > 0 && '・'}{n}</span>)}<small>（現）</small></span>
                  </div>
                ) : null}
              </dd></>)}
              {c.origin && (<><dt>成り立ち</dt><dd>{c.origin}</dd></>)}
              {c.parentCompany && (<><dt>親会社</dt><dd>{parent ? <Link href={`/companies/${parent.id}/`}>{c.parentCompany}</Link> : c.parentCompany}</dd></>)}
              {c.relatedCompanies.length > 0 && (<><dt>関連会社</dt><dd>{c.relatedCompanies.map((n, i) => { const r = findCompanyByName(n); return (<span key={n}>{i > 0 && '、'}{r && r.id !== c.id ? <Link href={`/companies/${r.id}/`}>{n}</Link> : n}</span>); })}</dd></>)}
              {c.corporateNumber && (<><dt>法人番号</dt><dd className="mono"><a href={c.corporateNumberUrl || `https://www.houjin-bangou.nta.go.jp/henkorireki-johoto.html?selHouzinNo=${c.corporateNumber}`} target="_blank" rel="noreferrer">{c.corporateNumber}</a></dd></>)}
              {c.formerCorporateNumbers?.length ? (<><dt>旧法人番号</dt><dd>{c.formerCorporateNumbers.map((f) => (
                <div key={f.number} className="former-corp"><a className="mono" href={`https://www.houjin-bangou.nta.go.jp/henkorireki-johoto.html?selHouzinNo=${f.number}`} target="_blank" rel="noreferrer">{f.number}</a>
                  <span className="small muted">{f.until ? `${ym(f.until)}まで` : ''}{f.note ? `（${f.note}）` : ''}</span></div>
              ))}</dd></>) : null}
            </dl>
          </section>
          <section className="notice">
            掲載情報に誤りや更新がある場合は、<a href={CORRECTION_FORM_URL} target="_blank" rel="noreferrer">情報修正を依頼する</a>からお知らせください。
            <div className="muted small" style={{ marginTop: 6 }}>
              出典: {c.source}{c.updatedAt && c.source.indexOf(c.updatedAt) < 0 ? `／${c.updatedAt.replace('-', '年')}月 編集部確認` : ''}
              {c.sources?.length ? (
                <ul className="co-src">
                  {c.sources.slice(0, 5).map((u) => <li key={u}><a href={u} target="_blank" rel="noreferrer">{srcLabel(u)}</a></li>)}
                </ul>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
