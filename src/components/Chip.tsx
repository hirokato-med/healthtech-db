import Link from 'next/link';
import { getCategory } from '@/lib/data';

export function CategoryChip({ slug }: { slug: string }) {
  const c = getCategory(slug);
  if (!c) return <span className="chip ghost">{slug}</span>;
  return (
    <Link href={`/categories/${c.slug}/`} className={`chip ${c.group}`}>
      {c.name}
    </Link>
  );
}

export function Chips({ slugs }: { slugs: string[] }) {
  return (
    <div className="chips">
      {slugs.map((s) => (
        <CategoryChip key={s} slug={s} />
      ))}
    </div>
  );
}
