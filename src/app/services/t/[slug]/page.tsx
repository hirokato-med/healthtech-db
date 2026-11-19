import { periodText, statusGroup, statusLabel, statusClass } from '@/lib/status';
import { shortCompany as short } from '@/lib/names';
import { AfterEnd } from '@/components/AfterEnd';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { END_REASONS, isStopped, categoryName, getArticles, getBizType, getBizTypes, getThemes, servicesOfType } from '@/lib/data';
import { ym } from '@/lib/ym';
import { STAGES, StageBadge, stageIndex } from '@/components/StageBadge';
import { DeviceTag } from '@/components/DeviceInfo';

export function generateStaticParams() {
  return getBizTypes().map((t) => ({ slug: t.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const t = getBizType((await params).slug);
  return { title: t ? `${t.name}の事業（${categoryName(t.category)}）` : '事業の種類', description: t?.description };
}

const NOW = 2026 + 10 / 12;
const toY = (s?: string | null) => {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})(?:-(\d{2}))?/);
  return m ? Number(m[1]) + (m[2] ? (Number(m[2]) - 1) / 12 : 0) : null;
};
/** 止まった事業でも、運営会社が変わっただけでサービスは続いているもの（年表の棒は続けて描き、続いた年数の平均には入れない） */
const continues = (s: { after?: { fate: string } }) => !!s.after && /^同一サービス継続/.test(s.after.fate);

/** 事業の種類のページ：その種類の事業が、いつ始まり、いつ・なぜ止まったかを年表と表で見る */
export default async function BizTypePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = getBizType(slug);
  if (!t) notFound();
  const all = servicesOfType(slug);
  // 準備中（開発・治験・申請中）の事業は年表に載せず、別の表にする。治験中止など開発状況未確認のもの（stageIndex = -1）は一番下
  const prep = all.filter((s) => s.status === '準備中').sort((a, b) => stageIndex(b.stage) - stageIndex(a.stage));
  // 記録した事業の内訳（足すと合計になるように、絞り込みと同じ区分で数える）
  const byGroup = (g: string) => all.filter((s) => statusGroup(s) === g).length;
  const items = all.filter((s) => s.status !== '準備中')
    // 開始時期が分からない事業は、提供を確認できた最も古い時点（knownSince）から点線で引く
    .map((s) => {
      const a0 = toY(s.startedAt) ?? (s.startedYear ?? null);
      const approx = a0 === null && !!s.knownSince;
      return { s, approx, a: a0 ?? toY(s.knownSince), b: isStopped(s) ? ((e) => (e === null ? null : Math.min(NOW, e)))(toY(s.endedAt)) : NOW, cont: isStopped(s) && continues(s) };
    })
    .sort((x, y) => (x.a ?? 9999) - (y.a ?? 9999));
  const dated = items.filter((x) => x.a !== null);
  const undated = items.filter((x) => x.a === null);
  const min = dated.length ? Math.floor(Math.min(...dated.map((x) => x.a as number))) : 2016;
  const from = Math.max(1990, (min - 1) - ((min - 1) % 2));
  const span = NOW - from;
  const pct = (y: number) => `${((Math.max(from, y) - from) / span) * 100}%`;
  const years = Array.from({ length: Math.floor(NOW) - from + 1 }, (_, i) => from + i).filter((y) => y % (span > 20 ? 4 : 2) === 0);
  const stopped = items.filter((x) => isStopped(x.s));
  // 理由のない止まった事業は「理由を確認できていない」に数える（止まった事業のページと同じ）。件数が止まった事業の数とずれないように、理由を確認できていないものも出す
  const reasonsOf = (s: { endReasons?: string[] }) => (s.endReasons?.length ? s.endReasons : ['unknown']);
  const reasons = Object.entries(END_REASONS)
    .map(([k, r]) => ({ k, label: r.label, n: stopped.filter((x) => reasonsOf(x.s).includes(k)).length }))
    .filter((r) => r.n)
    .sort((a, b) => Number(a.k === 'unknown') - Number(b.k === 'unknown') || b.n - a.n);
  // 止まった事業の平均の続いた年数（終了時期が分からないもの・運営会社が変わってサービスが続いているものは入れない）
  const livedFrom = stopped.filter((x) => x.a !== null && x.b !== null && !x.cont);
  const lived = livedFrom.map((x) => (x.b as number) - (x.a as number));
  const noEnd = stopped.filter((x) => x.b === null).length;
  const contN = stopped.filter((x) => x.cont).length;
  // 開始時期が分からない事業：提供を確認した時点から点線で引いたもの（approx）と、年表に載せていないもの（undated）を合わせて数える
  const approxN = items.filter((x) => x.approx).length;
  const avg = lived.length ? lived.reduce((p, v) => p + v, 0) / lived.length : null;
  const theme = t.theme ? getThemes().find((x) => x.slug === t.theme) : undefined;
  const articles = theme ? getArticles().filter((a) => theme.articles?.includes(a.slug)) : [];
  const siblings = getBizTypes().filter((x) => x.category === t.category && x.slug !== slug);

  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず">
        <Link href="/">トップ</Link> / <Link href="/services/">事業データベース</Link> / <Link href={`/services/c/${t.category}/`}>{categoryName(t.category)}</Link> / <span>{t.name}</span>
      </nav>
      <div className="page-head">
        <div className="kicker">Business type</div>
        <h1>{t.name}</h1>
        <p className="lead">{t.description}</p>
      </div>
      <section className="bt-kpi">
        <div><span>記録した事業</span><b>{all.length}件</b><small>{[
          dated.length ? `年表は${Math.floor(min)}年〜（${dated.length}件）` : '',
          approxN + undated.length ? `開始時期不明 ${approxN + undated.length}件${approxN ? `（うち${approxN}件は提供を確認した時点から点線で表示）` : ''}` : '',
          all.some((s) => s.device) ? `医療機器 ${all.filter((s) => s.device).length}件` : '',
        ].filter(Boolean).join('・')}</small></div>
        <div><span>いま提供中</span><b>{byGroup('提供中')}件</b><small>{[
          ['準備中', byGroup('準備中')], ['開発状況未確認', byGroup('開発状況未確認')], ['提供状況未確認', byGroup('提供状況未確認')], ['一時停止中', byGroup('一時停止中')],
        ].filter(([, n]) => n).map(([k, n]) => `${k} ${n}件`).join('・')}{[byGroup('準備中'), byGroup('開発状況未確認'), byGroup('提供状況未確認'), byGroup('一時停止中')].some(Boolean) ? 'は別に数えています' : ''}</small></div>
        <div><span>止まった事業</span><b>{stopped.length}件</b><small>終了・譲渡・統合・休止{contN ? `（うち運営会社が変わりサービスは続いているもの ${contN}件）` : ''}</small></div>
        <div><span>止まった事業が続いた年数</span><b>{avg !== null ? `平均 ${avg.toFixed(1)}年` : '—'}</b><small>{[lived.length ? `${lived.length}件の平均` : '', noEnd ? `終了時期未確認の${noEnd}件は除く` : '', contN ? `サービスが続いている${contN}件は除く` : ''].filter(Boolean).join('・')}</small></div>
      </section>
      {reasons.length > 0 && (
        <div className="bt-reasons"><b>止まった理由</b>{reasons.map((r) => <Link key={r.k} href={`/services/stopped/#${r.k}`} className="chip ghost">{r.label} {r.n}</Link>)}</div>
      )}
      {articles.map((a) => (
        <Link key={a.slug} href={`/articles/${a.slug}/`} className="learn-article" style={{ marginBottom: 20 }}><small>解説</small>{a.title}</Link>
      ))}

      {dated.length > 0 && (
        <section className="timeline-chart" aria-label="事業の開始と終了の年表">
          <div className="tc-axis">{years.map((y) => <span key={y} style={{ left: pct(y) }}>{y}</span>)}</div>
          {dated.map(({ s, a, b, approx, cont }) => (
            <div className="tc-row" key={s.id}>
              <Link href={`/services/${s.id}/`} className="tc-label">{s.name}<DeviceTag s={s} /><small>{short(s.company)}</small></Link>
              <div className="tc-track">
                {years.map((y) => <i key={y} className="tc-grid" style={{ left: pct(y) }} />)}
                {/* 止まった事業で終了日が分からないものは、短い棒を薄く消えていく形で描く（期間を決めつけない） */}
                <span className={`tc-bar st-${s.status}${approx ? ' approx' : ''}${isStopped(s) && b === null ? ' noend' : ''}`} style={{ left: pct(a as number), width: `max(6px, calc(${pct(b ?? (a as number) + 0.5)} - ${pct(a as number)}))` }} title={`${approx ? `開始時期は不明（${ym(s.knownSince)}には提供を確認）` : ym(s.startedAt) || s.startedYear + '年'} 〜 ${isStopped(s) ? `${s.endedAt ? ym(s.endedAt) : '終了時期は未確認'} ${statusLabel(s)}` : statusLabel(s)}`} />
                {cont && b !== null && <span className="tc-bar st-提供中 cont" style={{ left: pct(b), width: `max(6px, calc(${pct(NOW)} - ${pct(b)}))` }} title={`${ym(s.endedAt)}に${s.after!.event}。サービスは運営会社を変えて続いている`} />}
              </div>
            </div>
          ))}
          <div className="tc-legend"><span className="st-提供中">提供中</span><span className="st-終了">終了・休止</span><span className="st-統合">譲渡・統合</span><span className="st-不明">提供状況未確認</span><span className="approx">点線から始まる棒：開始時期は不明（その時点には提供を確認）</span><span className="noend">薄れて消える棒：終了時期は未確認</span>{contN > 0 && <span className="cont">薄い色で続く棒：運営会社が変わり、サービスは続いている</span>}</div>
        </section>
      )}

      {prep.length > 0 && (
        <section className="ma-sec">
          <h2>準備中の事業（開発・治験・申請中）</h2>
          <div className="stage-legend">{STAGES.map((s) => <StageBadge key={s} stage={s} />)}{prep.some((s) => stageIndex(s.stage) < 0) && <StageBadge stage="治験中止・治験終了・発表のみ（開発状況未確認）" />}</div>
          {prep.some((s) => stageIndex(s.stage) < 0) && <p className="muted small">治験が中止・終了して次の段階を確かめられないもの、発表だけで発売を確かめられないものは、開発が続いているか分からないため目盛りを付けず、表の下にまとめています。</p>}
          <div className="earn-wrap">
            <table className="earn-table bt-prep">
              <thead><tr><th>事業</th><th>会社</th><th>段階</th><th>最近の経過</th></tr></thead>
              <tbody>
                {prep.map((s) => {
                  const m = (s.milestones ?? []).at(-1);
                  return (
                    <tr key={s.id}>
                      <td><Link href={`/services/${s.id}/`}>{s.name}</Link></td>
                      <td>{s.companyId ? <Link href={`/companies/${s.companyId}/`}>{short(s.company)}</Link> : short(s.company)}</td>
                      <td><StageBadge stage={s.stage} /></td>
                      <td>{m ? <>{m.text}<small>{ym(m.date)}</small></> : <small>—</small>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {stopped.length > 0 && (
        <section className="ma-sec">
          <h2>止まった事業と、その理由</h2>
          <div className="earn-wrap">
            <table className="earn-table bt-stop">
              <thead><tr><th>事業</th><th>会社</th><th>期間</th><th>状態</th><th>止まった理由</th></tr></thead>
              <tbody>
                {stopped.map(({ s }) => (
                  <tr key={s.id}>
                    <td><Link href={`/services/${s.id}/`}>{s.name}</Link></td>
                    <td>{s.companyId ? <Link href={`/companies/${s.companyId}/`}>{short(s.company)}</Link> : short(s.company)}</td>
                    <td className="nw">{periodText(s)}</td>
                    <td><span className={`badge st-${statusClass(s)}`}>{statusLabel(s)}</span></td>
                    <td>
                      <span className="chips">{reasonsOf(s).map((r) => <span key={r} className={`chip ghost${r === 'unknown' ? ' unk' : ''}`}>{END_REASONS[r]?.label ?? r}{s.endReasonInfo?.inferred?.includes(r) ? '（推定）' : ''}</span>)}</span>
                      {s.after && s.after.fate !== '提供終了' && <AfterEnd a={s.after} compact />}
                      <small>{s.endReasonNote}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {undated.length > 0 && (
        <section className="ma-sec">
          <h2>開始時期を確認中の事業（年表に載せていないもの）</h2>
          <p className="muted small">{undated.map(({ s }, i) => <span key={s.id}>{i > 0 && '、'}<Link href={`/services/${s.id}/`}>{s.name}</Link>（{short(s.company)}）</span>)}</p>
        </section>
      )}

      <section className="ma-sec">
        <h2>{categoryName(t.category)}のほかの事業の種類</h2>
        <div className="tx-nav">{siblings.map((x) => <Link key={x.slug} href={`/services/t/${x.slug}/`}>{x.name}<span>{servicesOfType(x.slug).length}</span></Link>)}</div>
      </section>
    </>
  );
}
