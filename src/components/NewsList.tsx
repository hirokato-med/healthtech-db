import Link from 'next/link';
import type { NewsItem } from '@/lib/types';
import { categoryName, fmtDate } from '@/lib/data';
import { CategoryChip } from './Chip';

/** ニュースのカテゴリ。見出しから推しただけのものは「推定」と書き、確かな分類のようには見せない */
export function NewsCategory({ n }: { n: NewsItem }) {
  if (!n.category) return null;
  if (n.categoryBy === 'title') return <span className="chip ghost" title="見出しの言葉から推したカテゴリです（確かめていません）">{categoryName(n.category)}（推定）</span>;
  return <span title={n.categoryBy === 'company' ? 'この会社の主なカテゴリ' : undefined}><CategoryChip slug={n.category} /></span>;
}

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
            {n.tier === 'top' && n.change && <div className="news-change">{n.change}</div>}
            <div className="sub">
              {n.companyId ? <Link href={`/companies/${n.companyId}/`}>{n.company}</Link> : n.company && <span>{n.company}</span>}
              <NewsCategory n={n} />
              <span>PR TIMES</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
