import Link from 'next/link';
import type { Company } from '@/lib/types';
import { Chips } from './Chip';

export function CompanyCard({ c }: { c: Company }) {
  return (
    <article className="card">
      <Link href={`/companies/${c.id}/`} className="title">
        {c.name}
      </Link>
      <Chips slugs={c.categories} />
      {c.description && <p className="desc">{c.description}</p>}
      <div className="meta">
        {c.prefecture && <span>{c.prefecture}</span>}
        {c.foundedYear && <span>{c.foundedYear}年創業</span>}
        <span className={`badge ${c.exit === '上場' ? 'listed' : ['閉鎖', '合併', '活動停止', '対象外'].includes(c.exit) ? 'closed' : ''}`}>{c.exit}</span>
      </div>
    </article>
  );
}
