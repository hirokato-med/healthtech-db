import Link from 'next/link';
import { getCategory } from '@/lib/data';

/** 分類ラベル。塗らずに、分類色の文字で出す */
export function CategoryChip({ slug }: { slug: string }) {
  const c = getCategory(slug);
  if (!c) return <span className="label">{slug}</span>;
  return (
    <Link href={`/categories/${c.slug}/`} className={`label ${c.group}`}>
      {c.name}
    </Link>
  );
}

export function Chips({ slugs }: { slugs: string[] }) {
  return (
    <span className="labels">
      {slugs.map((s) => (
        <CategoryChip key={s} slug={s} />
      ))}
    </span>
  );
}
