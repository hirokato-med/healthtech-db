import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/site';

export const metadata: Metadata = {
  title: { default: `${SITE_NAME} | ${SITE_TAGLINE}`, template: `%s | ${SITE_NAME}` },
  description: `${SITE_NAME} は、医師・加藤浩晃が個人事業として運営するヘルスケアビジネスのデータベースです。国内ヘルステック企業・サービス・人物・ニュース・解説記事をつなげて見渡せます。`,
  metadataBase: new URL('https://healthtech-db.com'),
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'ja_JP' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Header />
        <main className="container page">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
