import Link from 'next/link';
import type { Company } from '@/lib/types';
import { getCategory } from '@/lib/data';
import { Chips } from './Chip';
import { Tile, initialOf } from './Tile';

/** 企業の一覧行（罫線区切り・青い見出しリンク・右に代替タイル） */
export function CompanyCard({ c }: { c: Company }) {
  const g = getCategory(c.categories[0] ?? '')?.group;
  return (
    <article className="item">
      <div className="body">
        <Chips slugs={c.categories} />
        <Link href={`/companies/${c.id}/`} className="title">{c.name}</Link>
        {c.description && <p className="desc">{c.description}</p>}
        <div className="meta">
          {c.prefecture && <span className="tag">{c.prefecture}</span>}
          {c.foundedYear && <span className="tag">{c.foundedYear}年創業</span>}
          <span className={`tag ${c.exit === '上場' ? 'listed' : ''}`}>{c.exit}</span>
        </div>
      </div>
      <Tile text={initialOf(c.name)} group={g} />
    </article>
  );
}
