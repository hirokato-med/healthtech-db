import Link from 'next/link';

export function SectionHead({ title, href, more = 'もっと見る' }: { title: string; href?: string; more?: string }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {href && (
        <Link className="more" href={href}>
          {more} →
        </Link>
      )}
    </div>
  );
}
