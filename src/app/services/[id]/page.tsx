import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SectionHead } from '@/components/SectionHead';
import { CORRECTION_FORM_URL } from '@/components/Footer';
import { categoryName, getCategory, getCompany, getService, getServices, servicesIn } from '@/lib/data';

export function generateStaticParams() {
  return getServices().map((s) => ({ id: s.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const s = getService((await params).id);
  return { title: s ? `${s.name}（${s.company}）` : 'サービス', description: s?.description };
}

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const s = getService((await params).id);
  if (!s) notFound();
  const company = s.companyId ? getCompany(s.companyId) : undefined;
  const siblings = servicesIn(s.category).filter((x) => x.id !== s.id).slice(0, 6);
  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">トップ</Link>›<Link href="/services/">サービス</Link>›<span>{s.name}</span></nav>
      <div className="page-head">
        <Link href={`/categories/${s.category}/`} className={`label ${getCategory(s.category)?.group ?? ''}`}>{categoryName(s.category)}</Link>
        <h1>{s.name}</h1>
        <p className="lead">{s.description}</p>
      </div>
      <div className="two-col" style={{ marginTop: 20 }}>
        <section className="section">
          <SectionHead title="同じカテゴリのサービス" count={`${siblings.length}件`} />
          {siblings.length ? (
            <div className="rows">
              {siblings.map((x) => (
                <article className="item" key={x.id}>
                  <div className="body">
                    <Link href={`/services/${x.id}/`} className="title">{x.name}</Link>
                    <div className="meta"><span>{x.company}</span>{x.startedYear && <span>{x.startedYear}年開始</span>}</div>
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="muted small">同じカテゴリのサービスはまだ登録されていません。</p>}
        </section>
        <aside style={{ display: 'grid', gap: 12 }}>
          <section className="side-box">
            <h3>サービス情報</h3>
            <dl className="kv">
              <dt>提供企業</dt><dd>{company ? <Link href={`/companies/${company.id}/`}>{company.name}</Link> : s.company}</dd>
              {s.hp && (<><dt>Webサイト</dt><dd><a href={s.hp} target="_blank" rel="noreferrer">{s.hp.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a></dd></>)}
              {s.startedYear && (<><dt>開始年</dt><dd>{s.startedYear}年</dd></>)}
              <dt>状態</dt><dd>{s.status}</dd>
            </dl>
          </section>
          <p className="notice" style={{ margin: 0 }}>情報の修正は<a href={CORRECTION_FORM_URL} target="_blank" rel="noreferrer">情報修正依頼フォーム</a>から。</p>
        </aside>
      </div>
    </>
  );
}
