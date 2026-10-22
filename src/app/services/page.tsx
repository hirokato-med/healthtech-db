import type { Metadata } from 'next';
import Link from 'next/link';
import { categoryName, getServices } from '@/lib/data';

export const metadata: Metadata = { title: 'サービス一覧', description: '国内ヘルステック企業が提供するサービス・事業の一覧。' };

export default function ServicesPage() {
  const services = getServices();
  return (
    <>
      <div className="page-head">
        <div className="kicker">Services</div>
        <h1>サービス一覧</h1>
        <p className="lead">企業が提供する個別のサービス・事業。{services.length} 件。企業ページから提供企業にたどれます。</p>
      </div>
      <div className="grid wide">
        {services.map((s) => (
          <article className="card" key={s.id}>
            <Link href={`/services/${s.id}/`} className="title">{s.name}</Link>
            <div className="chips"><Link href={`/categories/${s.category}/`} className="chip">{categoryName(s.category)}</Link></div>
            <p className="desc">{s.description}</p>
            <div className="meta">
              {s.companyId ? <Link href={`/companies/${s.companyId}/`}>{s.company}</Link> : <span>{s.company}</span>}
              {s.startedYear && <span>{s.startedYear}年開始</span>}
              <span className="badge">{s.status}</span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
