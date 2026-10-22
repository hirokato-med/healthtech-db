import Link from 'next/link';

export function SectionHead({ title, href, more = 'もっと見る', count }: { title: string; href?: string; more?: string; count?: string }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {href ? (
        <Link className="more" href={href}>{more} →</Link>
      ) : (
        count && <span className="count">{count}</span>
      )}
    </div>
  );
}
