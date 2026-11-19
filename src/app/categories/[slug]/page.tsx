import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleCard } from '@/components/ArticleCard';
import { CompanyCard } from '@/components/CompanyCard';
import { NewsList } from '@/components/NewsList';
import { StageBadge } from '@/components/StageBadge';
import { articlesIn, companiesIn, getBizTypes, getCategories, getCategory, getNews, isStopped, servicesIn, statusLabel } from '@/lib/data';
import { statusClass } from '@/lib/status';
import type { ReactNode } from 'react';
import type { Service } from '@/lib/types';

/** 最初に出す件数。残りは「残り○件を表示」で開く */
const FIRST = 12;
const STOPPED_CO = ['閉鎖', '合併', '活動停止'];
const year = (d?: string) => d?.match(/^(\d{4})/)?.[1];

/** 事業の時期。準備中は開始年を出さない（まだ始まっていない）。事業群は製品ごとに違うので出さない。止まった事業は終わった年も添える */
function period(s: Service) {
  if (s.kind === 'group' || s.status === '準備中') return '';
  const start = year(s.startedAt) ?? (s.startedYear ? String(s.startedYear) : undefined);
  const end = isStopped(s) ? year(s.endedAt) : undefined;
  const endWord = s.status === '譲渡' ? '譲渡' : s.status === '統合' ? '統合' : s.status === '休止' ? '休止' : '終了';
  if (start && end) return `${start}年開始〜${end}年${endWord}`;
  if (start) return `${start}年開始`;
  if (end) return `${end}年${endWord}`;
  return '';
}

function ServiceRows({ list }: { list: Service[] }) {
  return (
    <div className="list">
      {list.map((s) => (
        <div className="row" key={s.id} style={{ gridTemplateColumns: '1fr' }}>
          <div>
            <Link href={`/services/${s.id}/`}>{s.name}</Link>
            <div className="sub">
              <span className={`badge st-${statusClass(s)}`}>{statusLabel(s)}</span>
              {s.status === '準備中' && s.stage ? <StageBadge stage={s.stage} /> : null}
              {s.companyId ? <Link href={`/companies/${s.companyId}/`}>{s.company}</Link> : <span>{s.company}</span>}
              {period(s) && <span>{period(s)}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** 最初の FIRST 件を出し、残りは開いて見る */
function Folded<T>({ items, render, unit }: { items: T[]; render: (list: T[]) => ReactNode; unit: string }) {
  if (items.length <= FIRST) return <>{render(items)}</>;
  return (
    <>
      {render(items.slice(0, FIRST))}
      <details className="seg-more" style={{ marginTop: 16 }}>
        <summary>残り {items.length - FIRST} {unit}を表示</summary>
        {render(items.slice(FIRST))}
      </details>
    </>
  );
}

export function generateStaticParams() {
  return getCategories().map((c) => ({ slug: c.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = getCategory((await params).slug);
  return { title: c ? `${c.name} の企業・事業・記事` : 'カテゴリ', description: c ? `${c.name}（${c.groupLabel}）に属する国内ヘルステック企業、事業、ニュース、解説記事。` : undefined };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = getCategory((await params).slug);
  if (!c) notFound();
  // 企業：活動中の会社を先に、閉鎖・合併・活動停止した会社を後に。それぞれ創業の新しい順（創業年が分からない会社は最後）
  const companies = [...companiesIn(c.slug)].sort(
    (a, b) => Number(STOPPED_CO.includes(a.exit)) - Number(STOPPED_CO.includes(b.exit)) || (b.foundedYear ?? 0) - (a.foundedYear ?? 0) || a.name.localeCompare(b.name, 'ja'),
  );
  // 事業：いま提供中・準備中・状況未確認のものと、止まったもの（終了・譲渡・統合・休止）を分ける。それぞれ開始の新しい順
  const byStart = (a: Service, b: Service) => (b.startedAt ?? String(b.startedYear ?? '')).localeCompare(a.startedAt ?? String(a.startedYear ?? '')) || a.name.localeCompare(b.name, 'ja');
  const services = servicesIn(c.slug);
  const live = services.filter((s) => !isStopped(s)).sort(byStart);
  const stopped = services.filter((s) => isStopped(s)).sort(byStart);
  const articles = articlesIn(c.slug);
  // ニュースは、このカテゴリの企業に紐付いたものだけ（見出しの言葉から推しただけのカテゴリでは載せない）
  const ids = new Set(companies.map((x) => x.id));
  const news = getNews().filter((n) => n.tier !== 'out' && n.companyId && ids.has(n.companyId)).slice(0, 10);
  const types = getBizTypes().filter((t) => t.category === c.slug);
  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず">
        <Link href="/">トップ</Link> / <Link href="/categories/">カテゴリ</Link> / <span>{c.name}</span>
      </nav>
      <div className="page-head">
        <div className="kicker"><span className={`axis-dot ${c.group}`} aria-hidden="true" />カテゴリ（{c.groupLabel}）</div>
        <h1>{c.name}</h1>
        {c.note && <p className="lead">{c.note}</p>}
        {types.length > 0 && <p className="lead">主な事業の種類：{types.map((t) => t.name).join('、')}</p>}
        <p className="lead">企業 {companies.length} 社 / 事業 {services.length} 件（うち止まった事業 {stopped.length} 件） / 記事 {articles.length} 本</p>
      </div>
      {articles.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>記事</h2></div>
          <div className="grid wide">{articles.map((a) => <ArticleCard key={a.slug} a={a} />)}</div>
        </section>
      )}
      <section className="section">
        <div className="section-head"><h2>企業<small className="muted small"> 活動中の会社を先に、創業の新しい順</small></h2></div>
        {companies.length ? (
          <Folded items={companies} unit="社" render={(list) => <div className="grid">{list.map((x) => <CompanyCard key={x.id} c={x} />)}</div>} />
        ) : (
          <p className="muted">このカテゴリに登録された企業はまだありません。</p>
        )}
      </section>
      {live.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>事業<small className="muted small"> 提供中・準備中・状況未確認 {live.length} 件、開始の新しい順</small></h2></div>
          <Folded items={live} unit="件" render={(list) => <ServiceRows list={list} />} />
        </section>
      )}
      {stopped.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>止まった事業<small className="muted small"> 終了・譲渡・統合・休止 {stopped.length} 件</small></h2></div>
          <Folded items={stopped} unit="件" render={(list) => <ServiceRows list={list} />} />
        </section>
      )}
      <section className="section">
        <div className="section-head"><h2>このカテゴリの企業のニュース</h2><Link className="more" href="/news/">すべてのニュース →</Link></div>
        <NewsList items={news} empty="このカテゴリの企業に紐付いたニュースは、いまはありません。" />
      </section>
    </>
  );
}
