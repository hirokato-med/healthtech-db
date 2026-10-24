import type { Metadata } from 'next';
import Link from 'next/link';
import { BusinessFilter } from '@/components/BusinessFilter';
import { END_REASONS, STOPPED, getBizTypes, getCategories, getServices, getThemes, servicesInTheme } from '@/lib/data';

export const metadata: Metadata = { title: '事業データベース', description: 'ヘルスケアの事業・サービスが、いつ始まり、どう進み、止まったならなぜ止まったのかを出典つきで記録したデータベース。' };

export default function ServicesPage() {
  const services = getServices();
  const items = services.map(({ id, name, company, companyId, category, description, status, startedAt, startedYear, endedAt, endReasons }) => ({ id, name, company, companyId, category, description: description.length > 90 ? `${description.slice(0, 90)}…` : description, status, startedAt, startedYear, endedAt, endReasons }));
  const stopped = services.filter((s) => STOPPED.includes(s.status)).length;
  // カテゴリ → 事業の種類（件数の多い順に5つまで）
  const types = getBizTypes();
  const cats = getCategories().map((c) => {
    const inCat = services.filter((s) => s.category === c.slug && s.type);
    const ts = types.filter((t) => t.category === c.slug).map((t) => ({ t, n: inCat.filter((s) => s.type === t.slug).length })).filter((x) => x.n).sort((a, b) => b.n - a.n);
    return { c, n: inCat.length, ts };
  });
  const groups = [...new Set(getCategories().map((c) => c.groupLabel))];
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
      {groups.map((g) => (
        <section key={g} className="tx-sec">
          <div className="tx-group">{g}</div>
          <div className="tx-cats">
            {cats.filter((x) => x.c.groupLabel === g && x.n).map(({ c, n, ts }) => (
              <div key={c.slug} className="tx-cat">
                <h3><Link href={`/services/c/${c.slug}/`}>{c.name}</Link><small>{n}件</small></h3>
                <ul>
                  {ts.slice(0, 5).map(({ t, n: k }) => <li key={t.slug}><Link href={`/services/c/${c.slug}/#${t.slug}`}>{t.name}</Link><span>{k}件</span></li>)}
                  <li className="all"><Link href={`/services/c/${c.slug}/`}>すべての事業の種類を見る（{ts.length}種類）→</Link></li>
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}

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
      <h2 className="tx-all">すべての事業から探す</h2>
      <BusinessFilter items={items} categories={getCategories()} reasons={END_REASONS} />
    </>
  );
}
