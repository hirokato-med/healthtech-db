import { statusLabel, statusClass, pastLine } from '@/lib/status';
import type { Metadata } from 'next';
import Link from 'next/link';
import { withBase } from '@/lib/base';
import { notFound } from 'next/navigation';
import { CORRECTION_FORM_URL } from '@/components/Footer';
import { getBusinessModel, END_REASONS, categoryName, getBizType, getCompany, getService, getServices, servicesIn, servicesOfType } from '@/lib/data';
import { ym, jpDates as J } from '@/lib/ym';
import { StageBadge } from '@/components/StageBadge';
import { DevicePanel, DeviceTag } from '@/components/DeviceInfo';
import { ReasonInfo } from '@/components/ReasonInfo';
import { AfterEnd } from '@/components/AfterEnd';
import { BusinessModelPanel } from '@/components/BusinessModelPanel';

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
/** 括弧の中身にすでに括弧があるときは、外側を「：」にして二重の括弧を避ける */
const paren = (x: string) => (/[（(]/.test(x) ? `：${x}` : `（${x}）`);
/** 略語だけのカテゴリ名に、日本語の説明を添える（カテゴリの印で使う） */
const ABBR: Record<string, string> = { DMP: '疾病管理プログラム', PHR: '個人の健康記録', RWD: '実際の診療から集めたデータ', D2C: '消費者への直接販売', CRO: '医薬品開発の受託機関' };
const catLabel = (slug: string) => { const n = categoryName(slug); return ABBR[n] ? `${ABBR[n]}（${n}）` : n; };
/** 経過の汎用の「開始」と重なる節目（同じ年月の提供開始・発売など。治験・研究の開始は別の出来事） */
const isStartLike = (t: string) => /開始|発売|リリース|ローンチ|サービスイン/.test(t) && !/治験|試験|研究|申請|実証/.test(t);
const isEndLike = (t: string) => /終了|譲渡|統合|合併|休止|閉鎖|撤退/.test(t);
/** Web アーカイブの保存版の URL なら、元のサイト名と保存した年月を返す */
const archived = (u: string) => { const m = u.match(/^https?:\/\/web\.archive\.org\/web\/(\d{4})(\d{2})\d*\/(.+)$/); return m ? { y: m[1], m: Number(m[2]), orig: m[3].replace(/^https?:\/\//, '').replace(/\/$/, '') } : null; };

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const s = getService((await params).id);
  if (!s) notFound();
  const company = s.companyId ? getCompany(s.companyId) : undefined;
  const bm = getBusinessModel(s.id);
  const bt = s.type ? getBizType(s.type) : undefined;
  // 近い事業：同じ種類（治療用アプリなど）を先に、足りない分を同じカテゴリから
  const sameType = s.type ? servicesOfType(s.type).filter((x) => x.id !== s.id) : [];
  const siblings = [...sameType, ...servicesIn(s.category).filter((x) => x.id !== s.id && !sameType.includes(x))].slice(0, 6);
  // 経過の行：汎用の「開始」「終了」は、同じ年月の節目と重なるときは出さない
  const ms = s.milestones ?? [];
  const sameYm = (a?: string, b?: string) => !!a && !!b && a.slice(0, 7) === b.slice(0, 7) && a.length >= 7 && b.length >= 7;
  const startRow = s.kind !== 'group' && (s.startedAt || s.startedYear) && !(s.startedAt && ms.some((x) => sameYm(x.date, s.startedAt) && isStartLike(x.text)))
    ? [{ date: s.startedAt || String(s.startedYear), text: '開始', start: true }] : [];
  const history = [...startRow, ...ms].sort((a, b) => (a.date || '').slice(0, 7).localeCompare((b.date || '').slice(0, 7)) || Number(!('start' in a)) - Number(!('start' in b)));
  const showEndRow = !!s.endedAt && !ms.some((x) => sameYm(x.date, s.endedAt) && isEndLike(x.text));
  const plannedRow = !!s.plannedEnd && !s.plannedEnd.confirmedAt;
  const historyCount = history.length + Number(showEndRow) + Number(plannedRow) + Number(!!s.suspension?.temporary);
  // 事業群の製品の一覧：事業のしくみの製品の表と同じ元から作る（製品のページが無い製品も入れる）
  const groupItems = s.kind === 'group'
    ? (bm?.members?.length
      ? bm.members.map((x) => { const r = x.existingId ? getService(x.existingId) : undefined; return { key: x.existingId ?? x.name, id: r?.id, name: x.name.replace(/[（(].*$/, ''), label: r ? statusLabel(r) : x.status || '未確認' }; })
      : (s.members ?? []).map((id) => getService(id)).filter((r): r is NonNullable<typeof r> => !!r).map((r) => ({ key: r.id, id: r.id as string | undefined, name: r.name, label: statusLabel(r) })))
    : [];
  const hpArc = s.hp ? archived(s.hp) : null;
  // 医療機器の情報は、医療機器の事業か、医療機器が並ぶ種類（画像診断AI など）の事業で出す
  // 医療機器の欄は、医療機器の事業だけに出す（医薬品・再生医療等製品の開発品には出さない）
  const notDevice = /innovative-drug|generic-drug|gene-nucleic|regenerative-cell|otc-consumer|cdmo/.test(s.type ?? '');
  const showDevice = !notDevice && (!!s.device || (!!s.type && servicesOfType(s.type).some((x) => x.device)));
  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず">
        <Link href="/">トップ</Link> / <Link href="/services/">事業</Link> / <Link href={`/services/c/${s.category}/`}>{categoryName(s.category)}</Link>
        {bt && <> / <Link href={`/services/c/${s.category}/#${bt.slug}`}>{bt.name}</Link></>} / <span>{s.name}</span>
      </nav>
      <div className="page-head">
        <div className="kicker">Business</div>
        <h1>{s.name}</h1>
        <p className="svc-provider">{s.companyId ? <Link href={`/companies/${s.companyId}/`}>{company?.name ?? s.company}</Link> : s.company}の事業</p>
        <div className="state-line" style={{ marginTop: 10 }}>
          <div><i>現在の提供状況</i><span className={`badge st-${statusClass(s)}`}>{statusLabel(s)}</span>{s.status === '準備中' && <StageBadge stage={s.stage} />}</div>
          {pastLine(s) && <div><i>過去の出来事</i><span>{J(pastLine(s))}</span></div>}
        </div>
        <div className="chips" style={{ marginTop: 8 }}><DeviceTag s={s} /><Link href={`/categories/${s.category}/`} className="chip">{catLabel(s.category)}</Link></div>
        <p className="lead">{J(s.description)}</p>
        {groupItems.length ? <p className="co-scope"><b>事業群の記録</b>複数の製品をまとめた記録です（{groupItems.length}製品）。状態・薬事・開始時期は製品ごとに見られます：{groupItems.map((r, i) => <span key={r.key}>{i ? '、' : ''}{r.id ? <Link href={`/services/${r.id}/`}>{r.name}</Link> : r.name}（{r.label}）</span>)}</p> : null}
        {s.groupId && (() => { const g = getService(s.groupId!); return g ? <p className="co-scope"><b>事業群</b>この製品は<Link href={`/services/${g.id}/`}>{g.name}</Link>に含まれます。</p> : null; })()}
        {s.kind === 'contract' && s.relatedServiceId && (() => { const r = getService(s.relatedServiceId!); return r ? <p className="co-scope"><b>契約の記録</b>これは製品そのものではなく、提携・販売権の契約の記録です。製品のページ：<Link href={`/services/${r.id}/`}>{r.name}</Link>（{statusLabel(r)}）</p> : null; })()}
      </div>
      <div className="two-col">
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(0, 1fr)', minWidth: 0 }}>
          {s.plannedEnd && (
            <section className="panel plan-panel">
              <h3>{s.plannedEnd.kind}の予定</h3>
              <dl className="kv">
                <dt>提供状態</dt><dd>{s.plannedEnd.confirmedAt ? `${s.plannedEnd.kind}（${ymd(s.plannedEnd.confirmedAt)}に確認）` : '提供中'}</dd>
                <dt>{s.plannedEnd.kind}予定日</dt><dd>{ymd(s.plannedEnd.date)}{!s.plannedEnd.confirmedAt && s.plannedEnd.date.slice(0, 10) < TODAY ? <span className="small muted">（予定日を過ぎています。{s.plannedEnd.kind}を確かめるまで「提供中」のままにしています）</span> : null}</dd>
                <dt>発表日</dt><dd>{s.plannedEnd.announcedAt ? ymd(s.plannedEnd.announcedAt) : '確認中'}</dd>
                <dt>{s.plannedEnd.kind}の確認</dt><dd>{s.plannedEnd.confirmedAt ? ymd(s.plannedEnd.confirmedAt) : '未確認（予定日のあとに確かめます）'}</dd>
              </dl>
              {s.plannedEnd.note && <p className="small">{J(s.plannedEnd.note)}{s.plannedEnd.source && <> <a href={s.plannedEnd.source} target="_blank" rel="noopener noreferrer">出典</a></>}</p>}
              {s.endReasons?.length ? <><p className="small" style={{ marginTop: 8 }}><b>発表された理由：</b>{s.endReasons.map((r) => END_REASONS[r]?.label ?? r).join('・')}</p>{s.endReasonNote && <p className="small">{s.endReasonNote}</p>}</> : null}
              {s.successor && <p className="small"><b>引き継ぎ先：</b>{s.successor}</p>}
            </section>
          )}
          {['提供中', '準備中', '不明'].includes(s.status) && s.pastEvents?.length ? (
            <section className="panel">
              <h3>過去の出来事</h3>
              <ul className="co-history">{s.pastEvents.map((e) => <li key={e.date + e.text}><span>{ym(e.date)}</span>{J(e.text)}{e.source && <> <a href={e.source} target="_blank" rel="noopener noreferrer" className="small">出典</a></>}</li>)}</ul>
              {s.endReasons?.length ? <><p className="small" style={{ marginTop: 8 }}><b>出来事の理由：</b>{s.endReasons.map((r) => `${END_REASONS[r]?.label ?? r}${s.endReasonInfo?.inferred?.includes(r) ? '（推定）' : ''}`).join('・')}</p>{s.endReasonInfo?.inferredNote && <p className="small muted">推定の根拠：{s.endReasonInfo.inferredNote}</p>}{s.endReasonNote && <p className="small">{J(s.endReasonNote)}</p>}</> : null}
              <p className="small muted">{s.status === '提供中' ? 'いまも提供が続いているため、止まった事業の件数には入れていません。' : s.status === '準備中' ? 'まだ提供の前（準備中）のため、止まった事業の件数には入れていません。' : '終了したかどうかを確かめられていないため、止まった事業の件数には入れていません。'}</p>
            </section>
          ) : null}
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
          {bm && <BusinessModelPanel m={bm} s={s} />}
          {showDevice && <DevicePanel s={s} reg={bm?.regulatory} />}
          {historyCount > 0 && (
            <section className="panel">
              <h3>経過</h3>
              <ul className="co-history">
                {/* 開始・節目を年月の順に並べる（開始より前の承認などが先に来る） */}
                {history.map((m) => <li key={m.date + m.text}><span>{'start' in m && !s.startedAt ? `${s.startedYear}年` : ym(m.date)}</span>{J(m.text)}</li>)}
                {plannedRow && s.plannedEnd && <li className="planned"><span>{ymd(s.plannedEnd.date)}</span>{s.plannedEnd.kind}予定{s.plannedEnd.announcedAt ? `（${ymd(s.plannedEnd.announcedAt)}発表）` : ''}</li>}
                {s.suspension?.temporary && <li><span>{ymd(s.suspension.since)}</span>一時停止（{s.suspension.cause}）</li>}
                {showEndRow && s.endedAt && <li><span>{ym(s.endedAt)}</span>{J(`${s.after ? `${s.after.event}${s.after.note ? paren(s.after.note) : ''}` : s.status === '譲渡' ? '事業を譲渡' : s.status === '統合' ? '合併・統合' : s.status === '休止' ? '休止' : '提供を終了'}${s.successor ? paren(s.successor) : ''}`)}</li>}
              </ul>
            </section>
          )}
          {siblings.length > 0 && (
            <section className="panel">
              <h3>{sameType.length ? '同じ種類・カテゴリの事業' : '同じカテゴリの事業'}</h3>
              <div className="list">
                {siblings.map((x) => (
                  <div className="row" key={x.id} style={{ gridTemplateColumns: '1fr' }}>
                    <div>
                      <Link href={`/services/${x.id}/`}>{x.name}</Link>
                      <div className="sub"><span>{x.company}</span><span className={`badge st-${statusClass(x)}`}>{statusLabel(x)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        <aside style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 1fr)', minWidth: 0 }}>
          <section className="panel">
            <h3>事業の情報</h3>
            <dl className="kv">
              <dt>提供企業</dt><dd>{company ? <Link href={`/companies/${company.id}/`}>{company.name}</Link> : s.company}</dd>
              {s.hp && (<><dt>Webサイト</dt><dd>{hpArc ? <>{hpArc.orig}<span className="small muted">（リンク先は Web アーカイブの<a href={s.hp} target="_blank" rel="noreferrer">{hpArc.y}年{hpArc.m}月の保存版</a>）</span></> : <a href={s.hp} target="_blank" rel="noreferrer">{s.hp.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>}</dd></>)}
              {s.kind !== 'group' && (s.startedAt || s.startedYear) && (<><dt>開始</dt><dd>{ym(s.startedAt) || `${s.startedYear}年`}</dd></>)}
              <dt>状態</dt><dd><span className={`badge st-${statusClass(s)}`}>{statusLabel(s)}</span>{s.endedAt ? <span className="small muted">（{ym(s.endedAt)}）</span> : null}{s.plannedEnd && !s.plannedEnd.confirmedAt ? <span className="small muted">（{ymd(s.plannedEnd.date)}に{s.plannedEnd.kind}予定）</span> : null}</dd>
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
