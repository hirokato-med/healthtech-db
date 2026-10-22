import Link from 'next/link';
import { SearchBox } from './SearchBox';

const NAV = [
  ['/articles/', '記事'],
  ['/news/', 'ニュース'],
  ['/companies/', '企業'],
  ['/services/', 'サービス'],
  ['/talents/', '人物'],
  ['/categories/', 'カテゴリ'],
  ['/global/', '海外'],
  ['/webinars/', 'マンスリーレビュー'],
] as const;

export function Header() {
  return (
    <header className="site-header">
      <div className="container bar">
        <Link href="/" className="logo" aria-label="Healthtech DB トップ">
          <span className="mark">H</span>
          <span>Healthtech DB</span>
        </Link>
        <nav className="nav" aria-label="メイン">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <SearchBox />
      </div>
    </header>
  );
}
