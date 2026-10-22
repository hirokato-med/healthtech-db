import Link from 'next/link';
import type { ArticleMeta } from '@/lib/types';
import { fmtDate } from '@/lib/data';
import { CategoryChip } from './Chip';

export function ArticleCard({ a }: { a: ArticleMeta }) {
  return (
    <article className="card">
      <div className="chips">{a.category && <CategoryChip slug={a.category} />}</div>
      <Link href={`/articles/${a.slug}/`} className="title">
        {a.title}
      </Link>
      {a.summary && <p className="desc">{a.summary}</p>}
      <div className="meta">
        <span>{fmtDate(a.date)}</span>
        <span>{a.author}</span>
      </div>
    </article>
  );
}
