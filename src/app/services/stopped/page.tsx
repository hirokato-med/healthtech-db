import type { Metadata } from 'next';
import Link from 'next/link';
import { END_REASONS, STOPPED, getServices } from '@/lib/data';
import { ym } from '@/lib/ym';

export const metadata: Metadata = { title: '止まった事業を理由別に見る', description: 'ヘルスケアの事業がどのような理由で止まったのか。規制、保険償還、お金を払う人、現場への定着、効果の実証、資金などの理由別に、過去の事業を一覧する。' };


export default function StoppedPage() {
  const stopped = getServices().filter((s) => STOPPED.includes(s.status));
  const groups = Object.entries(END_REASONS)
    .map(([key, r]) => ({ key, ...r, items: stopped.filter((s) => (s.endReasons?.length ? s.endReasons : ['unknown']).includes(key)) }))
    .filter((g) => g.items.length);
  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">トップ</Link> / <Link href="/services/">事業</Link> / <span>止まった事業</span></nav>
      <div className="page-head">
        <div className="kicker">Stopped businesses</div>
        <h1>止まった事業を理由別に見る</h1>
        <p className="lead">
          同じようなアイデアは何度も生まれ、同じところで止まります。過去の事業がどこで止まったのかを理由別に並べました。
          理由は、当事者の発表など公開された事実にもとづいて分類しています（公表されていないものは「理由は非公表」）。{stopped.length} 件。
        </p>
      </div>
      <nav className="reason-index">
        {groups.map((g) => <a key={g.key} href={`#${g.key}`}>{g.label}<span>{g.items.length}</span></a>)}
      </nav>
      {groups.map((g) => (
        <section key={g.key} id={g.key} className="reason-group">
          <h2>{g.label}<small>{g.items.length}件</small></h2>
          <p className="muted">{g.note}</p>
          <div className="list">
            {g.items.map((s) => (
              <div className="row" key={s.id} style={{ gridTemplateColumns: '1fr' }}>
                <div>
                  <Link href={`/services/${s.id}/`} style={{ fontWeight: 700 }}>{s.name}</Link>
                  <span className={`badge st-${s.status}`} style={{ marginLeft: 8 }}>{s.status}</span>
                  <div className="sub">
                    {s.companyId ? <Link href={`/companies/${s.companyId}/`}>{s.company}</Link> : <span>{s.company}</span>}
                    <span>{ym(s.startedAt) || (s.startedYear ? `${s.startedYear}年` : '')} 〜 {ym(s.endedAt)}</span>
                  </div>
                  {s.endReasonNote && <p className="reason-note">{s.endReasonNote}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
