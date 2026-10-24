import Link from 'next/link';
import type { UpdateEntry } from '@/lib/types';

const KIND_CLASS: Record<string, string> = { 決算: 'k-earn', 資金調達: 'k-fund', 企業: 'k-co', '提携・M&A': 'k-ma', 事業: 'k-sv', 記事: 'k-art' };
const md = (d: string) => d.replace(/^\d{4}-(\d{2})-(\d{2})$/, (_, m, dd) => `${Number(m)}/${Number(dd)}`);

/** データの更新の一覧。new は基準日から7日以内に印をつける */
export function UpdateList({ items, now, compact = false }: { items: UpdateEntry[]; now: string; compact?: boolean }) {
  const recent = (d: string) => (Date.parse(now) - Date.parse(d)) / 864e5 <= 7;
  return (
    <ul className={`upd-list${compact ? ' compact' : ''}`}>
      {items.map((u, i) => (
        <li key={i}>
          <span className="upd-date">{md(u.date)}{recent(u.date) && <em>NEW</em>}</span>
          <span className={`upd-kind ${KIND_CLASS[u.kind] ?? ''}`}>{u.kind}</span>
          <div className="upd-body">
            {u.href ? <Link href={u.href} className="upd-title">{u.title}</Link> : <span className="upd-title">{u.title}</span>}
            {!compact && u.body && <p>{u.body}</p>}
            {u.links?.length ? (
              <div className="upd-links">
                {u.links.slice(0, compact ? 5 : 40).map((l) => <Link key={l.href + l.label} href={l.href}>{l.label}</Link>)}
                {compact && u.links.length > 5 && <span className="muted">ほか{u.links.length - 5}件</span>}
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
