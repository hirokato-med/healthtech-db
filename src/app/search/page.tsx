import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchClient } from '@/components/SearchClient';

export const metadata: Metadata = { title: '検索' };

export default function SearchPage() {
  return (
    <div className="narrow">
      <div className="page-head" style={{ borderBottom: 0, paddingBottom: 4 }}>
        <div className="kicker">検索</div>
        <h1>企業・サービス・人物を探す</h1>
      </div>
      <Suspense fallback={<p className="muted small">読み込み中…</p>}>
        <SearchClient />
      </Suspense>
    </div>
  );
}
