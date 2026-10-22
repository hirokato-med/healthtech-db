import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: { default: 'Healthtech DB — 国内ヘルスケアビジネスデータベース', template: '%s | Healthtech DB' },
  description: 'Healthtech DB は、ヘルスケア領域に特化した事業DBです。国内ヘルステック企業・サービス・人物・ニュース・解説記事をつなげて見渡せます。',
  metadataBase: new URL('https://healthtech-db.com'),
  openGraph: { type: 'website', siteName: 'Healthtech DB', locale: 'ja_JP' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Header />
        <main className="container">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
