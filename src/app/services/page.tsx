import type { Metadata } from 'next';
import Link from 'next/link';
import { BusinessFilter } from '@/components/BusinessFilter';
import { END_REASONS, STOPPED, getCategories, getServices } from '@/lib/data';

export const metadata: Metadata = { title: '事業データベース', description: 'ヘルスケアの事業・サービスが、いつ始まり、どう進み、止まったならなぜ止まったのかを出典つきで記録したデータベース。' };

export default function ServicesPage() {
  const services = getServices();
  const items = services.map(({ id, name, company, companyId, category, description, status, startedAt, startedYear, endedAt, endReasons }) => ({ id, name, company, companyId, category, description, status, startedAt, startedYear, endedAt, endReasons }));
  const stopped = services.filter((s) => STOPPED.includes(s.status)).length;
  return (
    <>
      <div className="page-head">
        <div className="kicker">Businesses</div>
        <h1>事業データベース</h1>
        <p className="lead">
          ヘルスケアの事業・サービスが、いつ始まり、どう進み、止まったならなぜ止まったのか。公開情報をもとに出典つきで記録しています。{services.length} 件（うち止まった事業 {stopped} 件）。
          <Link href="/services/stopped/" className="why-link">止まった事業を理由別に見る</Link>
        </p>
      </div>
      <BusinessFilter items={items} categories={getCategories()} reasons={END_REASONS} />
    </>
  );
}
