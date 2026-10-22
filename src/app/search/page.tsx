import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchClient } from '@/components/SearchClient';

export const metadata: Metadata = { title: '検索' };

export default function SearchPage() {
  return (
    <>
      <div className="page-head">
        <div className="kicker">Search</div>
        <h1>検索</h1>
        <p className="lead">企業・サービス・人物・カテゴリ・海外企業・記事を横断して探します。</p>
      </div>
      <Suspense fallback={<p className="muted">読み込み中…</p>}>
        <SearchClient />
      </Suspense>
    </>
  );
}
