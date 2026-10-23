import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CORRECTION_FORM_URL } from '@/components/Footer';
import { END_REASONS, categoryName, getCompany, getService, getServices, servicesIn } from '@/lib/data';
import { ym } from '@/lib/ym';

export function generateStaticParams() {
  return getServices().map((s) => ({ id: s.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const s = getService((await params).id);
  return { title: s ? `${s.name}（${s.company}）` : 'サービス', description: s?.description };
}


export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const s = getService((await params).id);
  if (!s) notFound();
  const company = s.companyId ? getCompany(s.companyId) : undefined;
  const siblings = servicesIn(s.category).filter((x) => x.id !== s.id).slice(0, 6);
  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず">
        <Link href="/">トップ</Link> / <Link href="/services/">事業</Link> / <span>{s.name}</span>
      </nav>
      <div className="page-head">
        <div className="kicker">Business</div>
        <h1>{s.name}</h1>
        <div className="chips" style={{ marginTop: 10 }}><span className={`badge st-${s.status}`}>{s.status}</span><Link href={`/categories/${s.category}/`} className="chip">{categoryName(s.category)}</Link></div>
        <p className="lead">{s.description}</p>
      </div>
      <div className="two-col">
        <div style={{ display: 'grid', gap: 20 }}>
          {s.status !== '提供中' && s.status !== '不明' && (
            <section className="panel stop-panel">
              <h3>止まった理由</h3>
              <div className="chips">{(s.endReasons?.length ? s.endReasons : ['unknown']).map((r) => <Link key={r} href={`/services/stopped/#${r}`} className="chip">{END_REASONS[r]?.label ?? r}</Link>)}</div>
              <p>{s.endReasonNote || '止まった理由は公表されていない。'}</p>
              {s.successor && <p className="small"><b>引き継ぎ先：</b>{s.successor}</p>}
              {s.lessons && <p className="lessons"><b>編集部の見立て</b>{s.lessons}</p>}
            </section>
          )}
          {(s.startedAt || s.startedYear || s.milestones?.length || s.endedAt) && (
            <section className="panel">
              <h3>経過</h3>
              <ul className="co-history">
                {(s.startedAt || s.startedYear) && <li><span>{ym(s.startedAt) || `${s.startedYear}年`}</span>開始</li>}
                {(s.milestones ?? []).map((m) => <li key={m.date + m.text}><span>{ym(m.date)}</span>{m.text}</li>)}
                {s.endedAt && <li><span>{ym(s.endedAt)}</span>{s.status === '譲渡' ? '事業を譲渡' : s.status === '統合' ? '合併・統合' : s.status === '休止' ? '休止' : '提供を終了'}{s.successor ? `（${s.successor}）` : ''}</li>}
              </ul>
            </section>
          )}
          {siblings.length > 0 && (
            <section className="panel">
              <h3>同じカテゴリの事業</h3>
              <div className="list">
                {siblings.map((x) => (
                  <div className="row" key={x.id} style={{ gridTemplateColumns: '1fr' }}>
                    <div>
                      <Link href={`/services/${x.id}/`}>{x.name}</Link>
                      <div className="sub"><span>{x.company}</span><span className={`badge st-${x.status}`}>{x.status}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        <aside style={{ display: 'grid', gap: 16 }}>
          <section className="panel">
            <h3>事業の情報</h3>
            <dl className="kv">
              <dt>提供企業</dt><dd>{company ? <Link href={`/companies/${company.id}/`}>{company.name}</Link> : s.company}</dd>
              {s.hp && (<><dt>Webサイト</dt><dd><a href={s.hp} target="_blank" rel="noreferrer">{s.hp.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a></dd></>)}
              {(s.startedAt || s.startedYear) && (<><dt>開始</dt><dd>{ym(s.startedAt) || `${s.startedYear}年`}</dd></>)}
              <dt>状態</dt><dd><span className={`badge st-${s.status}`}>{s.status}</span>{s.endedAt ? <span className="small muted">（{ym(s.endedAt)}）</span> : null}</dd>
            </dl>
          </section>
          {s.sources?.length ? (
            <section className="panel"><h3>出典</h3><ul className="co-src">{s.sources.map((u) => <li key={u}><a href={u} target="_blank" rel="noreferrer">{u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 50)}</a></li>)}</ul></section>
          ) : null}
          <section className="notice">
            情報の修正は<a href={CORRECTION_FORM_URL} target="_blank" rel="noreferrer">情報修正依頼フォーム</a>から。
          </section>
        </aside>
      </div>
    </>
  );
}
