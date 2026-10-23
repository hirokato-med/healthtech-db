import Link from 'next/link';
import { LogoMark } from './Logo';
import { NEWSLETTER_URL } from './Footer';
import { SITE_NAME } from '@/lib/site';

export function Header() {
  return (
    <header className="site-header">
      <div className="container bar">
        <Link href="/" className="logo" aria-label={`${SITE_NAME} トップ`}>
          <LogoMark />
          <span className="name">{SITE_NAME}</span>
        </Link>
        <nav className="nav" aria-label="メイン">
          <Link href="/articles/">記事一覧</Link>
          <div className="drop">
            <button type="button" aria-haspopup="true">データベース</button>
            <div className="drop-menu">
              <Link href="/companies/">企業データベース<span>国内のヘルスケア企業</span></Link>
              <Link href="/services/">サービスデータベース<span>企業が提供する事業・サービス</span></Link>
              <Link href="/talents/">人物データベース<span>創業者・代表者</span></Link>
              <Link href="/global/">海外企業<span>米国・欧州・アジア</span></Link>
            </div>
          </div>
          <Link href="/news/">ニュース</Link>
          <Link href="/categories/">カテゴリ</Link>
          <Link href="/webinars/">マンスリーレビュー</Link>
        </nav>
        <div className="head-right">
          <span className="divider" />
          <Link href="/search/" className="head-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <span>検索</span>
          </Link>
          <a href={NEWSLETTER_URL} target="_blank" rel="noreferrer" className="btn-cta">
            <span className="free">無料</span>
            <span><span className="label-long">毎朝の</span>メルマガ登録</span>
            <span className="arrow" />
          </a>
        </div>
      </div>
    </header>
  );
}
