'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BASE_PATH } from '@/lib/base';

const TABS = [
  ['/', 'トップ'],
  ['/companies/', '企業'],
  ['/services/', 'サービス'],
  ['/talents/', '人物'],
  ['/categories/', 'カテゴリ'],
  ['/news/', 'ニュース'],
  ['/articles/', '記事'],
  ['/global/', '海外'],
  ['/webinars/', 'マンスリーレビュー'],
] as const;

const WD = ['日', '月', '火', '水', '木', '金', '土'];

/** 現在のパスがタブに属するか（basePath を外して比較） */
export function useActive() {
  const raw = usePathname() ?? '/';
  const path = BASE_PATH && raw.startsWith(BASE_PATH) ? raw.slice(BASE_PATH.length) || '/' : raw;
  return (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
}

export function Header({ stats, updated }: { stats: { companies: number; services: number; people: number; news: number }; updated: string }) {
  const isActive = useActive();
  const d = new Date(updated || Date.now());
  const today = `${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`;
  return (
    <header className="site-header">
      <div className="container">
        <div className="masthead">
          <Link href="/" className="brand" aria-label="Healthtech DB トップ">
            <span className="brand-name">Healthtech DB</span>
            <span className="brand-sub">国内ヘルスケアビジネスデータベース</span>
          </Link>
          <div className="mast-right">
            <span className="mast-date">{today}</span>
            <Link href="/search/" className="search-pill">🔍 検索</Link>
          </div>
        </div>
        <nav className="tabs" aria-label="メイン">
          {TABS.map(([href, label]) => (
            <Link key={href} href={href} className="tab" aria-current={isActive(href) ? 'page' : undefined}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="ticker">
        <div className="container ticker-in">
          <span>
            収録 企業<b>{stats.companies}</b>社
            <span className="sep">サービス</span><b>{stats.services}</b>件
            <span className="sep">人物</span><b>{stats.people}</b>名
            <span className="sep">ニュース</span><b>{stats.news}</b>本
          </span>
          {updated && <span>{d.getMonth() + 1}/{d.getDate()} 更新</span>}
        </div>
      </div>
    </header>
  );
}
