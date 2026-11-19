import { periodText, statusLabel, statusClass } from '@/lib/status';
import type { Metadata } from 'next';
import Link from 'next/link';
import { END_REASONS, isStopped, getServices } from '@/lib/data';
import { ReasonInfo } from '@/components/ReasonInfo';
import { AfterEnd } from '@/components/AfterEnd';

export const metadata: Metadata = { title: '止まった事業を理由別に見る', description: 'ヘルスケアの事業がどのような理由で止まったのか。規制、保険償還、お金を払う人、現場への定着、効果の実証、資金などの理由別に、過去の事業を一覧する。' };


const FATES = ['同一サービス継続（運営会社が変更）', '別サービスへ移行', '一部継続', '提供終了', '休止中', '未確認'] as const;
const STATED = ['明示あり', '経過だけ', '非公表（会社が明示）', '理由を確認できていない'] as const;
/** 冒頭の「理由の書かれ方」での呼び方。下の理由の分類の「理由を確認できていない」とは数え方が違うので、別の言葉にする */
const STATED_LABEL: Record<string, string> = { 明示あり: '理由の明示あり', 経過だけ: '経過だけ（理由そのものは書かれていない）', '非公表（会社が明示）': '会社が非公表と明示', 理由を確認できていない: '資料に理由の記載なし' };

export default function StoppedPage() {
  const all = getServices();
  const stopped = all.filter((s) => isStopped(s));
  // 終了・譲渡が発表されたが、まだ提供中のもの（予定日の近い順）と、障害などで一時停止しているもの。どちらも上の件数には入れない
  const planned = all.filter((s) => s.plannedEnd && !s.plannedEnd.confirmedAt).sort((a, b) => a.plannedEnd!.date.localeCompare(b.plannedEnd!.date));
  const paused = all.filter((s) => s.suspension?.temporary && !s.suspension.resumedAt);
  const ymd = (d: string) => d.replace(/^(\d{4})-(\d{2})(?:-(\d{2}))?.*$/, (_, y, m, dd) => `${y}年${Number(m)}月${dd ? `${Number(dd)}日` : ''}`);
  // 0件の区分は出さない。決まった選択肢にない値は「その他」として数え、合計が全体と合うようにする
  const count = (xs: { label: string; n: number }[]) => xs.filter((x) => x.n > 0).map((x) => `${x.label} ${x.n}件`).join('・');
  const statedLine = count(STATED.map((b) => ({ label: STATED_LABEL[b], n: stopped.filter((s) => s.endReasonInfo?.stated === b).length })).concat([{ label: '記録なし', n: stopped.filter((s) => !s.endReasonInfo || !(STATED as readonly string[]).includes(s.endReasonInfo.stated)).length }]));
  const fateLine = count(FATES.map((f): { label: string; n: number } => ({ label: f, n: stopped.filter((s) => s.after?.fate === f).length })).concat([
    { label: 'その他', n: stopped.filter((s) => s.after && !(FATES as readonly string[]).includes(s.after.fate)).length },
    { label: '記録なし', n: stopped.filter((s) => !s.after).length },
  ]));
  const inferredN = stopped.filter((s) => s.endReasonInfo?.inferred?.length).length;
  const interpN = stopped.filter((s) => s.endReasonInfo?.interpretation === '推定を含む').length;
  const groups = Object.entries(END_REASONS)
    .map(([key, r]) => ({ key, ...r, items: stopped.filter((s) => (s.endReasons?.length ? s.endReasons : ['unknown']).includes(key)) }))
    .filter((g) => g.items.length);
  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">トップ</Link> / <Link href="/services/">事業データベース</Link> / <span>止まった事業</span></nav>
      <div className="page-head">
        <div className="kicker">Stopped businesses</div>
        <h1>止まった事業を理由別に見る</h1>
        <p className="lead">
          同じようなアイデアは何度も生まれ、同じところで止まります。過去の事業がどこで止まったのかを理由別に並べました。ここには、もとの運営会社が撤退・譲渡・統合したものを含み、別の会社のもとでいまも続いているサービスもあります（「その後」の欄）。
          理由は、当事者の発表など公開された資料にもとづいて分類しています（資料で理由を確かめられないものは「理由を確認できていない」）。{stopped.length} 件。
        </p>
        <dl className="kv stop-summary">
          <dt>資料での理由の書かれ方</dt><dd>{statedLine}</dd>
          <dt>止まったあとのサービスの扱い</dt><dd>{fateLine}<br /><span className="small muted">合併・譲渡の出来事は確かめていても、サービスがいまも続いているかを確かめられていないものは「未確認」としています。</span></dd>
          <dt>「推定」の印</dt><dd><span className="basis basis-推定">理由の分類が推定</span>理由の分類そのものが、資料に直接書かれておらず、経過からこの DB が決めたもの（{inferredN}件）。<br /><span className="basis">説明に DB の解釈を含む</span>理由の説明の文に、この DB の解釈が入っているもの（{interpN}件。断り書きを付けています）。</dd>
        </dl>
      </div>
      {(planned.length > 0 || paused.length > 0) && (
        <section className="reason-group" id="planned">
          <h2>終了・譲渡の予定と、一時停止<small>{planned.length + paused.length}件</small></h2>
          <p className="muted">まだ止まっていない事業です。予定日が来ても自動で「終了」にはせず、終了を確かめてから移します。障害・不正アクセスによる一時停止も、事業をやめる判断ではないため下の件数に入れていません。</p>
          <div className="list">
            {planned.map((s) => (
              <div className="row" key={s.id} style={{ gridTemplateColumns: '1fr' }}>
                <div>
                  <Link href={`/services/${s.id}/`} style={{ fontWeight: 700 }}>{s.name}</Link>
                  <span className="badge st-提供中" style={{ marginLeft: 8 }}>{statusLabel(s)}</span>
                  <div className="sub">
                    {s.companyId ? <Link href={`/companies/${s.companyId}/`}>{s.company}</Link> : <span>{s.company}</span>}
                    <span>{s.plannedEnd!.kind}予定日 {ymd(s.plannedEnd!.date)}</span>
                    {s.plannedEnd!.announcedAt && <span>発表 {ymd(s.plannedEnd!.announcedAt)}</span>}
                  </div>
                  {s.plannedEnd!.note && <p className="reason-note">{s.plannedEnd!.note}</p>}
                </div>
              </div>
            ))}
            {paused.map((s) => (
              <div className="row" key={s.id} style={{ gridTemplateColumns: '1fr' }}>
                <div>
                  <Link href={`/services/${s.id}/`} style={{ fontWeight: 700 }}>{s.name}</Link>
                  <span className={`badge st-${statusClass(s)}`} style={{ marginLeft: 8 }}>{statusLabel(s)}</span>
                  <div className="sub">
                    {s.companyId ? <Link href={`/companies/${s.companyId}/`}>{s.company}</Link> : <span>{s.company}</span>}
                    <span>{ymd(s.suspension!.since)}から停止</span><span>原因：{s.suspension!.cause}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <nav className="reason-index">
        {groups.map((g) => <a key={g.key} href={`#${g.key}`}>{g.label}<span>{g.items.length}</span></a>)}
      </nav>
      {groups.map((g) => (
        <section key={g.key} id={g.key} className="reason-group">
          <h2>{g.label}<small>{g.items.length}件{((n) => (n ? `（うち理由の分類が推定 ${n}件）` : ''))(g.items.filter((s) => s.endReasonInfo?.inferred?.includes(g.key)).length)}</small></h2>
          <p className="muted">{g.note}</p>
          <div className="list">
            {g.items.map((s) => (
              <div className="row" key={s.id} style={{ gridTemplateColumns: '1fr' }}>
                <div>
                  <Link href={`/services/${s.id}/`} style={{ fontWeight: 700 }}>{s.name}</Link>
                  <span className={`badge st-${statusClass(s)}`} style={{ marginLeft: 8 }}>{statusLabel(s)}</span>
                  {s.endReasonInfo?.inferred?.includes(g.key) && <span className="basis basis-推定" style={{ marginLeft: 6 }} title="この理由の分類は資料に直接の記載がなく、DB が経過から分類したもの">理由の分類が推定</span>}
                  <div className="sub">
                    {s.companyId ? <Link href={`/companies/${s.companyId}/`}>{s.company}</Link> : <span>{s.company}</span>}
                    <span>{periodText(s)}</span>
                  </div>
                  {s.after && s.after.fate !== '提供終了' && <AfterEnd a={s.after} compact />}
                  {s.endReasonInfo && <ReasonInfo i={s.endReasonInfo} compact />}
                  {s.endReasonNote && <p className="reason-note">{s.endReasonNote}</p>}
                  {s.endReasonCaveat && <p className="caveat">注意：{s.endReasonCaveat}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
