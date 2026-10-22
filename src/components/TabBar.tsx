'use client';
import Link from 'next/link';
import { useActive } from './Header';

const I = {
  home: <path d="M3 11 12 3l9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />,
  co: <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M8 8h3M8 12h3M8 16h3M3 21h18" />,
  search: (<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  news: <path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5" />,
};

export function TabBar() {
  const isActive = useActive();
  const items: [string, string, keyof typeof I][] = [['/', 'トップ', 'home'], ['/companies/', '企業', 'co'], ['/search/', '検索', 'search'], ['/news/', 'ニュース', 'news']];
  return (
    <nav className="tabbar" aria-label="下部メニュー">
      {items.map(([href, label, icon]) => {
        const on = href === '/search/' ? false : isActive(href);
        return (
          <Link key={href} href={href} aria-current={on ? 'page' : undefined} >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{I[icon]}</svg>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
