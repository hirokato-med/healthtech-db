import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { TabBar } from '@/components/TabBar';
import { getCompanies, getNews, getPeople, getServices } from '@/lib/data';

export const metadata: Metadata = {
  title: { default: 'Healthtech DB — 国内ヘルスケアビジネスデータベース', template: '%s | Healthtech DB' },
  description: 'Healthtech DB は、ヘルスケア領域に特化した事業DBです。国内ヘルステック企業・サービス・人物・ニュース・解説記事をつなげて見渡せます。',
  metadataBase: new URL('https://healthtech-db.com'),
  openGraph: { type: 'website', siteName: 'Healthtech DB', locale: 'ja_JP' },
};
export const viewport: Viewport = { themeColor: '#14254a', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const news = getNews();
  const stats = { companies: getCompanies().length, services: getServices().length, people: getPeople().length, news: news.length };
  return (
    <html lang="ja">
      <body>
        <Header stats={stats} updated={news[0]?.publishedAt ?? ''} />
        <main className="container narrow">{children}</main>
        <Footer />
        <TabBar />
      </body>
    </html>
  );
}
