import Link from 'next/link';
import { SITE_NAME, SITE_NAME_EN } from '@/lib/site';

export const CORRECTION_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfOdqB0zZagrPQh2DqSsLvp2R_rLhudYyrRzungnipMVjQG7A/viewform';
export const NEWSLETTER_URL = 'https://hiroakikato.substack.com/';
/** 公式Xアカウント。旧アカウント（@db_healthtech）とは別に作り直すまで空にしておく（空ならリンクを出さない） */
export const X_URL = '';
export const X_HANDLE = '';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="cols">
          <div>
            <div className="flogo"><b>{SITE_NAME}</b><span>{SITE_NAME_EN}</span></div>
            <p>ヘルスケアビジネスの専門データベース。国内ヘルステック企業の事業・サービス・人物・ニュース・解説記事を、新規事業の実務で使いやすい形でまとめて提供します。</p>
            <p className="small" style={{ color: '#9aa1ad' }}>毎月のニュースの振り返りは、YouTube「医療ビジネスチャンネル」の #月刊ヘルステック で配信しています。</p>
          </div>
          <div>
            <h4>コンテンツ</h4>
            <ul>
              <li><Link href="/articles/">記事一覧</Link></li>
              <li><Link href="/companies/">企業データベース</Link></li>
              <li><Link href="/services/">サービスデータベース</Link></li>
              <li><Link href="/talents/">人物データベース</Link></li>
              <li><Link href="/global/">海外企業</Link></li>
              <li><Link href="/news/">ニュース</Link></li>
              <li><Link href="/categories/">カテゴリ</Link></li>
              <li><Link href="/monthly/">月刊ヘルステック（YouTube）</Link></li>
              <li><a href={NEWSLETTER_URL} target="_blank" rel="noreferrer">メルマガ</a></li>
            </ul>
          </div>
          <div>
            <h4>サイト情報</h4>
            <ul>
              <li><Link href="/about/">{SITE_NAME} とは</Link></li>
              <li><a href={CORRECTION_FORM_URL} target="_blank" rel="noreferrer">情報修正の依頼</a></li>
              <li><Link href="/terms/">利用規約</Link></li>
              <li><Link href="/privacy/">プライバシーポリシー</Link></li>
              {X_URL && <li><a href={X_URL} target="_blank" rel="noreferrer">X（@{X_HANDLE}）</a></li>}
            </ul>
          </div>
        </div>
        <div className="bottom">
          <span>本サイトの情報は一般的な情報提供を目的としており、投資・法的助言を構成するものではありません。</span>
          <span>© 2021-2026 {SITE_NAME}</span>
        </div>
      </div>
    </footer>
  );
}
