import Link from 'next/link';
import type { NewsItem } from '@/lib/types';
import { fmtDate } from '@/lib/data';
import { CategoryChip } from './Chip';

export function NewsList({ items, empty = 'ニュースはまだありません。' }: { items: NewsItem[]; empty?: string }) {
  if (!items.length) return <p className="muted">{empty}</p>;
  return (
    <div className="list">
      {items.map((n) => (
        <div className="row" key={n.id}>
          <div className="date mono">{fmtDate(n.publishedAt)}</div>
          <div>
            <a href={n.url} target="_blank" rel="noreferrer">
              {n.title}
            </a>
            <div className="sub">
              {n.companyId ? <Link href={`/companies/${n.companyId}/`}>{n.company}</Link> : n.company && <span>{n.company}</span>}
              {n.category && <CategoryChip slug={n.category} />}
              <span>PR TIMES</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
