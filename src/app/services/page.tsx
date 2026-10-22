import type { Metadata } from 'next';
import Link from 'next/link';
import { categoryName, getCategory, getServices } from '@/lib/data';

export const metadata: Metadata = { title: 'サービス一覧', description: '国内ヘルステック企業が提供するサービス・事業の一覧。' };

export default function ServicesPage() {
  const services = getServices();
  return (
    <div className="narrow">
      <div className="page-head">
        <div className="kicker">サービスDB</div>
        <h1>サービス一覧</h1>
        <p className="lead">企業が提供する個別のサービス・事業。提供企業のページにもたどれます。</p>
      </div>
      <p className="count-text" style={{ margin: '12px 0 4px' }}><b>{services.length}</b> 件</p>
      <div className="rows">
        {services.map((s) => (
          <article className="item" key={s.id}>
            <div className="body">
              <Link href={`/categories/${s.category}/`} className="label">{categoryName(s.category)}</Link>
              <Link href={`/services/${s.id}/`} className="title">{s.name}</Link>
              <p className="desc">{s.description}</p>
              <div className="meta">
                {s.companyId ? <Link href={`/companies/${s.companyId}/`} style={{ color: 'var(--accent)', fontWeight: 700 }}>{s.company}</Link> : <span>{s.company}</span>}
                {s.startedYear && <span className="tag">{s.startedYear}年開始</span>}
                <span className="tag">{s.status}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
