import type { MetadataRoute } from 'next';
import { getArticles, getBizTypes, getCategories, getCompanies } from '@/lib/data';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

/** ページの一覧（検索エンジン・AI 向け）。公開時に robots.txt から参照する */
export default function sitemap(): MetadataRoute.Sitemap {
  const u = (p: string) => `${SITE_URL}${p}`;
  return [
    ...['/', '/services/', '/companies/', '/funding/', '/earnings/', '/ma/', '/services/stopped/', '/updates/', '/about/', '/about/kato/', '/about/why/'].map((p) => ({ url: u(p) })),
    ...getCategories().map((c) => ({ url: u(`/services/c/${c.slug}/`) })),
    ...getBizTypes().map((t) => ({ url: u(`/services/t/${t.slug}/`) })),
    ...getArticles().map((a) => ({ url: u(`/articles/${a.slug}/`) })),
    ...getCompanies().map((c) => ({ url: u(`/companies/${c.id}/`) })),
  ];
}
