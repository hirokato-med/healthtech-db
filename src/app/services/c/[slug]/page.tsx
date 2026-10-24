import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { STOPPED, categoryName, getBizTypes, getCategories, getServices } from '@/lib/data';
import type { Service } from '@/lib/types';

export function generateStaticParams() {
  return getCategories().map((c) => ({ slug: c.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const name = categoryName((await params).slug);
  return { title: `${name}の事業`, description: `${name}にどんな事業があるかを種類ごとに分け、各社のサービスを並べています。` };
}

const yr = (s: Service) => {
  const a = s.startedAt?.slice(0, 4) || (s.startedYear ? String(s.startedYear) : '');
  const b = s.endedAt?.slice(0, 4);
  return a ? `${a}年〜${b ? `${b}年` : ''}` : b ? `〜${b}年` : '—';
};
const short = (n: string) => n.replace(/^株式会社|株式会社$/g, '').replace(/（.*$/, '');

export default async function CategoryBusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = getCategories().find((c) => c.slug === slug);
  if (!cat) notFound();
  const types = getBizTypes().filter((t) => t.category === slug);
  const all = getServices().filter((s) => s.category === slug && s.type);
  const groups = types
    .map((t) => {
      const list = all.filter((s) => s.type === t.slug).sort((a, b) => Number(STOPPED.includes(a.status)) - Number(STOPPED.includes(b.status)) || (a.startedAt || String(a.startedYear ?? '9999')).localeCompare(b.startedAt || String(b.startedYear ?? '9999')));
      return { t, list, stopped: list.filter((s) => STOPPED.includes(s.status)).length };
    })
    .sort((a, b) => Number(!a.list.length) - Number(!b.list.length));
  const stopped = all.filter((s) => STOPPED.includes(s.status)).length;
  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">トップ</Link> / <Link href="/services/">事業データベース</Link> / <span>{cat.name}</span></nav>
      <div className="page-head">
        <div className="kicker">Category</div>
        <h1>{cat.name}の事業</h1>
        <p className="lead">{cat.name}にどんな事業があるかを{types.length}つに分け、各社のサービスを並べています。{all.length}件（うち止まった事業 {stopped}件）。<Link href={`/categories/${slug}/`} className="why-link">このカテゴリの企業を見る</Link></p>
      </div>
      <nav className="tx-nav" aria-label="事業の種類">
        {groups.map(({ t, list }) => <a key={t.slug} href={`#${t.slug}`} className={list.length ? '' : 'empty'}>{t.name}<span>{list.length}</span></a>)}
      </nav>
      {groups.map(({ t, list, stopped: st }) => (
        <section key={t.slug} id={t.slug} className="tx-type">
          <div className="tx-type-h">
            <div><div className="tx-path">{cat.name} ›</div><h2><Link href={`/services/t/${t.slug}/`}>{t.name}</Link></h2><p>{t.description}</p></div>
            <div className="cnt"><b>{list.length}</b>件{list.length ? <><br />うち止まった {st}件</> : null}</div>
          </div>
          {list.length ? (
            <table className="tx-svc">
              <tbody>
                {list.map((s) => (
                  <tr key={s.id}>
                    <td className="n"><Link href={`/services/${s.id}/`}>{s.name}</Link></td>
                    <td className="c">{s.companyId ? <Link href={`/companies/${s.companyId}/`}>{short(s.company)}</Link> : short(s.company)}</td>
                    <td className="y">{yr(s)}</td>
                    <td className="st"><span className={`badge st-${s.status}`}>{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="tx-empty">まだ収録していません。</p>}
          {list.length > 0 && <div className="tl-more"><Link href={`/services/t/${t.slug}/`}>この事業の年表と、止まった理由を見る →</Link></div>}
        </section>
      ))}
    </>
  );
}
