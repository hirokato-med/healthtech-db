import Link from 'next/link';
import type { NewsItem } from '@/lib/types';
import { fmtDate } from '@/lib/data';
import { CategoryChip } from './Chip';

export function NewsList({ items, empty = 'ニュースはまだありません。' }: { items: NewsItem[]; empty?: string }) {
  if (!items.length) return <p className="muted small" style={{ padding: '16px 0' }}>{empty}</p>;
  return (
    <div className="rows">
      {items.map((n) => (
        <article className="item" key={n.id}>
          <div className="body">
            {n.category && <CategoryChip slug={n.category} />}
            <a href={n.url} target="_blank" rel="noreferrer" className="title ink">{n.title}</a>
            <div className="meta">
              {n.companyId ? <Link href={`/companies/${n.companyId}/`} style={{ color: 'var(--accent)', fontWeight: 700 }}>{n.company}</Link> : n.company && <span>{n.company}</span>}
              <span>{fmtDate(n.publishedAt)}</span>
              <span>PR TIMES ↗</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
