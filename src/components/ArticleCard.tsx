import Link from 'next/link';
import type { ArticleMeta } from '@/lib/types';
import { categoryName, fmtDate, getCategory } from '@/lib/data';
import { CategoryChip } from './Chip';
import { Tile } from './Tile';

/** 記事の一覧行（見出し左・タイル右） */
export function ArticleCard({ a }: { a: ArticleMeta }) {
  return (
    <article className="item">
      <div className="body">
        {a.category && <CategoryChip slug={a.category} />}
        <Link href={`/articles/${a.slug}/`} className="title ink">{a.title}</Link>
        <div className="meta"><span>{a.author}</span><span>{fmtDate(a.date)}</span></div>
      </div>
      <Tile text={categoryName(a.category)} color={getCategory(a.category)?.color} size="lg" />
    </article>
  );
}

/** トップの先頭だけ大きく出す注目記事 */
export function FeatureArticle({ a }: { a: ArticleMeta }) {
  return (
    <article className="feature">
      <Link href={`/articles/${a.slug}/`} aria-hidden="true" tabIndex={-1}>
        <Tile text={categoryName(a.category)} color={getCategory(a.category)?.color} size="wide" kicker="FEATURE" />
      </Link>
      {a.category && <CategoryChip slug={a.category} />}
      <Link href={`/articles/${a.slug}/`} className="title">{a.title}</Link>
      {a.summary && (
        <div className="quote">
          <span className="who">Healthtech DB 編集部のまとめ</span>
          <p>{a.summary}</p>
        </div>
      )}
      <div className="meta small muted">{a.author}・{fmtDate(a.date)}</div>
    </article>
  );
}
