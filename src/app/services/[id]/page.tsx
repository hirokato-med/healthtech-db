import { statusLabel } from '@/lib/status';
import type { Metadata } from 'next';
import Link from 'next/link';
import { withBase } from '@/lib/base';
import { notFound } from 'next/navigation';
import { CORRECTION_FORM_URL } from '@/components/Footer';
import { END_REASONS, categoryName, getBizType, getCompany, getService, getServices, servicesIn, servicesOfType } from '@/lib/data';
import { ym } from '@/lib/ym';
import { StageBadge } from '@/components/StageBadge';
import { DevicePanel, DeviceTag } from '@/components/DeviceInfo';
import { ReasonInfo } from '@/components/ReasonInfo';
import { AfterEnd } from '@/components/AfterEnd';

export function generateStaticParams() {
  return getServices().map((s) => ({ id: s.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const s = getService((await params).id);
  return { title: s ? `${s.name}（${s.company}）` : 'サービス', description: s?.description };
}


const TODAY = new Date().toISOString().slice(0, 10);
/** 「2027-01-13」→「2027年1月13日」（予定日・発表日は日まで出す。「（予定）」は付けない） */
const ymd = (d: string) => d.replace(/^(\d{4})-(\d{2})(?:-(\d{2}))?.*$/, (_, y, m, dd) => `${y}年${Number(m)}月${dd ? `${Number(dd)}日` : ''}`);

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const s = getService((await params).id);
  if (!s) notFound();
  const company = s.companyId ? getCompany(s.companyId) : undefined;
  const bt = s.type ? getBizType(s.type) : undefined;
  const siblings = servicesIn(s.category).filter((x) => x.id !== s.id).slice(0, 6);
  // 医療機器の情報は、医療機器の事業か、医療機器が並ぶ種類（画像診断AI など）の事業で出す
  const showDevice = !!s.device || s.status === '準備中' || (!!s.type && servicesOfType(s.type).some((x) => x.device));
  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず">
        <Link href="/">トップ</Link> / <Link href="/services/">事業</Link> / <Link href={`/services/c/${s.category}/`}>{categoryName(s.category)}</Link>
        {bt && <> / <Link href={`/services/c/${s.category}/#${bt.slug}`}>{bt.name}</Link></>} / <span>{s.name}</span>
      </nav>
      <div className="page-head">
        <div className="kicker">Business</div>
        <h1>{s.name}</h1>
        <p className="svc-provider">{s.companyId ? <Link href={`/companies/${s.companyId}/`}>{s.company}</Link> : s.company}の事業</p>
        <div className="chips" style={{ marginTop: 10 }}><span className={`badge st-${s.status}`}>{statusLabel(s)}</span>{s.status === '準備中' && <StageBadge stage={s.stage} />}<DeviceTag s={s} /><Link href={`/categories/${s.category}/`} className="chip">{categoryName(s.category)}</Link></div>
        <p className="lead">{s.description}</p>
      </div>
      <div className="two-col">
        <div style={{ display: 'grid', gap: 20 }}>
          {s.plannedEnd && (
            <section className="panel plan-panel">
              <h3>{s.plannedEnd.kind}の予定</h3>
              <dl className="kv">
                <dt>提供状態</dt><dd>{s.plannedEnd.confirmedAt ? `${s.plannedEnd.kind}（${ymd(s.plannedEnd.confirmedAt)}に確認）` : '提供中'}</dd>
                <dt>{s.plannedEnd.kind}予定日</dt><dd>{ymd(s.plannedEnd.date)}{!s.plannedEnd.confirmedAt && s.plannedEnd.date.slice(0, 10) < TODAY ? <span className="small muted">（予定日を過ぎています。{s.plannedEnd.kind}を確かめるまで「提供中」のままにしています）</span> : null}</dd>
                <dt>発表日</dt><dd>{s.plannedEnd.announcedAt ? ymd(s.plannedEnd.announcedAt) : '確認中'}</dd>
                <dt>{s.plannedEnd.kind}の確認</dt><dd>{s.plannedEnd.confirmedAt ? ymd(s.plannedEnd.confirmedAt) : '未確認（予定日のあとに確かめます）'}</dd>
              </dl>
              {s.plannedEnd.note && <p className="small">{s.plannedEnd.note}{s.plannedEnd.source && <> <a href={s.plannedEnd.source} target="_blank" rel="noopener noreferrer">出典</a></>}</p>}
              {s.endReasons?.length ? <><p className="small" style={{ marginTop: 8 }}><b>発表された理由：</b>{s.endReasons.map((r) => END_REASONS[r]?.label ?? r).join('・')}</p>{s.endReasonNote && <p className="small">{s.endReasonNote}</p>}</> : null}
              {s.successor && <p className="small"><b>引き継ぎ先：</b>{s.successor}</p>}
            </section>
          )}
          {s.suspension?.temporary && (
            <section className="panel plan-panel">
              <h3>一時停止中</h3>
              <dl className="kv">
                <dt>停止した日</dt><dd>{ymd(s.suspension.since)}</dd>
                <dt>原因</dt><dd>{s.suspension.cause}</dd>
                <dt>再開</dt><dd>{s.suspension.resumedAt ? ymd(s.suspension.resumedAt) : '未定'}</dd>
              </dl>
              {s.suspension.note && <p className="small">{s.suspension.note}</p>}
              <p className="small muted">障害・不正アクセスなどによる一時的な停止で、事業をやめる判断ではないため、「止まった事業」の数には入れていません。</p>
            </section>
          )}
          {s.status === '不明' && s.endReasonCaveat && (
            <section className="panel plan-panel">
              <h3>提供状況は未確認</h3>
              <p className="caveat">{s.endReasonCaveat}</p>
              <p className="small muted">終了を確かめられる資料が見つかるまで、止まった事業の件数・理由別の集計には入れていません。</p>
            </section>
          )}
          {!['提供中', '準備中', '不明'].includes(s.status) && !s.suspension?.temporary && (
            <section className="panel stop-panel">
              <h3>止まった理由</h3>
              <div className="chips">{(s.endReasons?.length ? s.endReasons : ['unknown']).map((r) => <Link key={r} href={`/services/stopped/#${r}`} className="chip">{END_REASONS[r]?.label ?? r}{s.endReasonInfo?.inferred?.includes(r) && <small className="basis basis-推定" style={{ marginLeft: 6 }}>推定</small>}</Link>)}</div>
              {s.after && <AfterEnd a={s.after} />}
              {s.endReasonInfo && <ReasonInfo i={s.endReasonInfo} />}
              <p>{s.endReasonNote || '止まった理由は公表されていない。'}</p>
              {s.endReasonCaveat && <p className="caveat">注意：{s.endReasonCaveat}</p>}
              {s.successor && <p className="small"><b>引き継ぎ先：</b>{s.successor}</p>}
              {s.lessons && <p className="lessons"><b className="kato-label"><img src={withBase('/images/kato-avatar.jpg')} alt="" width={22} height={22} />加藤浩晃の見立て</b>{s.lessons}</p>}
            </section>
          )}
          {showDevice && <DevicePanel s={s} />}
          {(s.startedAt || s.startedYear || s.milestones?.length || s.endedAt || s.plannedEnd || s.suspension) && (
            <section className="panel">
              <h3>経過</h3>
              <ul className="co-history">
                {/* 開始・節目を年月の順に並べる（開始より前の承認などが先に来る） */}
                {[...((s.startedAt || s.startedYear) ? [{ date: s.startedAt || String(s.startedYear), text: '開始', start: true }] : []), ...(s.milestones ?? [])]
                  .sort((a, b) => (a.date || '').slice(0, 7).localeCompare((b.date || '').slice(0, 7)) || Number(!('start' in a)) - Number(!('start' in b)))
                  .map((m) => <li key={m.date + m.text}><span>{'start' in m && !s.startedAt ? `${s.startedYear}年` : ym(m.date)}</span>{m.text}</li>)}
                {s.plannedEnd && !s.plannedEnd.confirmedAt && <li className="planned"><span>{ymd(s.plannedEnd.date)}</span>{s.plannedEnd.kind}予定{s.plannedEnd.announcedAt ? `（${ymd(s.plannedEnd.announcedAt)}発表）` : ''}</li>}
                {s.suspension?.temporary && <li><span>{ymd(s.suspension.since)}</span>一時停止（{s.suspension.cause}）</li>}
                {s.endedAt && <li><span>{ym(s.endedAt)}</span>{s.after ? `${s.after.event}${s.after.note ? `（${s.after.note}）` : ''}` : s.status === '譲渡' ? '事業を譲渡' : s.status === '統合' ? '合併・統合' : s.status === '休止' ? '休止' : '提供を終了'}{s.successor ? `（${s.successor}）` : ''}</li>}
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
                      <div className="sub"><span>{x.company}</span><span className={`badge st-${x.status}`}>{statusLabel(x)}</span></div>
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
              <dt>状態</dt><dd><span className={`badge st-${s.status}`}>{statusLabel(s)}</span>{s.endedAt ? <span className="small muted">（{ym(s.endedAt)}）</span> : null}{s.plannedEnd && !s.plannedEnd.confirmedAt ? <span className="small muted">（{ymd(s.plannedEnd.date)}に{s.plannedEnd.kind}予定）</span> : null}</dd>
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
