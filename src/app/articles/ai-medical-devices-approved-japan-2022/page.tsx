import type { Metadata } from 'next';
import Link from 'next/link';
import { withBase } from '@/lib/base';

// 旧記事（2022年版）の URL を、2026年版の記事へ転送する
const NEXT = '/articles/ai-medical-devices-approved-japan/';
export const metadata: Metadata = { title: '国内で承認されたAI医療機器一覧（2026年版へ移動しました）', robots: { index: false } };

export default function Moved() {
  return (
    <div className="page-head">
      <meta httpEquiv="refresh" content={`0; url=${withBase(NEXT)}`} />
      <h1>この記事は2026年版に移動しました</h1>
      <p className="lead"><Link href={NEXT}>国内で承認されたAI医療機器一覧【2026年版】</Link>をご覧ください。</p>
    </div>
  );
}
