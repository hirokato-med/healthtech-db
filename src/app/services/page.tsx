import type { Metadata } from 'next';
import Link from 'next/link';
import { BusinessFilter } from '@/components/BusinessFilter';
import { END_REASONS, STOPPED, getCategories, getServices, getThemes, servicesInTheme } from '@/lib/data';

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
      <section className="theme-index">
        <h2>テーマ別の歴代事業</h2>
        <p className="muted small">同じようなアイデアが、いつ生まれ、いつ止まったのか。テーマごとに年表で見られます。</p>
        <div className="theme-cards">
          {getThemes().map((t) => {
            const list = servicesInTheme(t.slug);
            return (
              <Link key={t.slug} href={`/services/themes/${t.slug}/`} className="theme-card">
                <b>{t.name}</b>
                <span>{list.length ? `${list.length}件（止まった事業 ${list.filter((x) => STOPPED.includes(x.status)).length}件）` : '調査中'}</span>
              </Link>
            );
          })}
        </div>
      </section>
      <BusinessFilter items={items} categories={getCategories()} reasons={END_REASONS} />
    </>
  );
}
