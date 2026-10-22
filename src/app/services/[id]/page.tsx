import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CORRECTION_FORM_URL } from '@/components/Footer';
import { categoryName, getCompany, getService, getServices, servicesIn } from '@/lib/data';

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
      <nav className="breadcrumb" aria-label="パンくず">
        <Link href="/">トップ</Link> / <Link href="/services/">サービス</Link> / <span>{s.name}</span>
      </nav>
      <div className="page-head">
        <div className="kicker">Service</div>
        <h1>{s.name}</h1>
        <div className="chips" style={{ marginTop: 10 }}><Link href={`/categories/${s.category}/`} className="chip">{categoryName(s.category)}</Link></div>
        <p className="lead">{s.description}</p>
      </div>
      <div className="two-col">
        <div style={{ display: 'grid', gap: 20 }}>
          {siblings.length > 0 && (
            <section className="panel">
              <h3>同じカテゴリのサービス</h3>
              <div className="list">
                {siblings.map((x) => (
                  <div className="row" key={x.id} style={{ gridTemplateColumns: '1fr' }}>
                    <div>
                      <Link href={`/services/${x.id}/`}>{x.name}</Link>
                      <div className="sub"><span>{x.company}</span>{x.startedYear && <span>{x.startedYear}年開始</span>}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        <aside style={{ display: 'grid', gap: 16 }}>
          <section className="panel">
            <h3>サービス情報</h3>
            <dl className="kv">
              <dt>提供企業</dt><dd>{company ? <Link href={`/companies/${company.id}/`}>{company.name}</Link> : s.company}</dd>
              {s.hp && (<><dt>Webサイト</dt><dd><a href={s.hp} target="_blank" rel="noreferrer">{s.hp.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a></dd></>)}
              {s.startedYear && (<><dt>開始年</dt><dd>{s.startedYear}年</dd></>)}
              <dt>ステータス</dt><dd><span className="badge">{s.status}</span></dd>
            </dl>
          </section>
          <section className="notice">
            情報の修正は<a href={CORRECTION_FORM_URL} target="_blank" rel="noreferrer">情報修正依頼フォーム</a>から。
          </section>
        </aside>
      </div>
    </>
  );
}
