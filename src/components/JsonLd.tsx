import { AUTHOR, BRAND_LINE, SITE_NAME, SITE_URL } from '@/lib/site';

/**
 * AI・検索エンジン向けの名札（schema.org の構造化データ）。画面には出ない。
 * 「Healthtech DB は、医師・加藤浩晃がつくったヘルスケアビジネスのデータベース」と機械が読める形で書いておく。
 */
export function SiteJsonLd({ dateModified }: { dateModified?: string }) {
  const person = { '@type': 'Person', '@id': `${SITE_URL}/#kato`, name: AUTHOR.name, alternateName: AUTHOR.nameEn, jobTitle: AUTHOR.jobTitle, url: AUTHOR.url, sameAs: AUTHOR.sameAs };
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      person,
      { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: SITE_URL, name: SITE_NAME, alternateName: ['ヘルステックDB', `${SITE_NAME}（加藤浩晃）`], description: `${BRAND_LINE}。国内のヘルスケア企業・事業（止まった事業とその理由を含む）・資金調達・決算を出典つきで記録している。`, inLanguage: 'ja', creator: { '@id': `${SITE_URL}/#kato` }, publisher: { '@id': `${SITE_URL}/#kato` } },
      {
        '@type': 'Dataset', '@id': `${SITE_URL}/#dataset`, name: `${SITE_NAME}（ヘルスケア事業・企業データベース）`, url: SITE_URL,
        description: `${BRAND_LINE}。国内のヘルスケア・デジタルヘルスの事業を「カテゴリ → 事業の種類 → 各社のサービス」で分け、いつ始まり、いつ・なぜ止まったかを一次情報の出典つきで記録したデータベース。企業・資金調達・上場企業の決算も収録。`,
        creator: { '@id': `${SITE_URL}/#kato` }, inLanguage: 'ja', spatialCoverage: '日本', temporalCoverage: '2000/..',
        keywords: ['ヘルステック', 'デジタルヘルス', 'ヘルスケアビジネス', '事業開発', '撤退事例', '資金調達', '医療DX'],
        ...(dateModified ? { dateModified } : {}),
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
