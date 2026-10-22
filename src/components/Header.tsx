'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BASE_PATH } from '@/lib/base';
import { SEARCH_COLOR, TABS, tabFor } from '@/lib/colors';

const WD = ['日', '月', '火', '水', '木', '金', '土'];

export function useCurrentPath() {
  const raw = usePathname() ?? '/';
  return BASE_PATH && raw.startsWith(BASE_PATH) ? raw.slice(BASE_PATH.length) || '/' : raw;
}
export function useActive() {
  const path = useCurrentPath();
  return (href: string) => tabFor(path)?.href === href;
}

export function Header({ stats, updated }: { stats: { companies: number; services: number; people: number; news: number }; updated: string }) {
  const path = useCurrentPath();
  const active = tabFor(path);
  const page = active ?? SEARCH_COLOR;
  const d = new Date(updated || Date.now());
  const today = `${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`;
  return (
    <>
      {/* 選択中のタブの色をページ全体（見出しの縦棒など）に渡す */}
      <style>{`:root{--page:${page.color};--page-ink:${page.ink};--page-text:${page.color === '#F5B700' ? '#A87400' : page.color}}`}</style>
      <header className="site-header">
        <div className="container">
          <div className="masthead">
            <Link href="/" className="brand" aria-label="Healthtech DB トップ">
              <span className="brand-name">
                <span style={{ color: '#E8384F' }}>H</span><span style={{ color: '#F2711C' }}>e</span><span style={{ color: '#F5B700' }}>a</span><span style={{ color: '#2DB34A' }}>l</span><span style={{ color: '#00A3C4' }}>t</span><span style={{ color: '#1E6FE8' }}>h</span><span style={{ color: '#6C4AD8' }}>t</span><span style={{ color: '#D63AA8' }}>e</span><span style={{ color: '#E8384F' }}>c</span><span style={{ color: '#F2711C' }}>h</span> DB
              </span>
              <span className="brand-sub">国内ヘルスケアビジネスデータベース</span>
            </Link>
            <div className="mast-right">
              <span className="mast-date">{today}</span>
              <Link href="/search/" className="search-pill">🔍 検索</Link>
            </div>
          </div>
        </div>
        <nav className="ctabs" aria-label="メイン">
          <div className="container ctabs-in">
            {TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="ctab"
                aria-current={active?.href === t.href ? 'page' : undefined}
                style={{ ['--c' as string]: t.color, ['--ci' as string]: t.ink }}
              >
                {t.label}
              </Link>
            ))}
          </div>
        </nav>
        <div className="cband" />
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
    </>
  );
}
