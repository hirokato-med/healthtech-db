/**
 * 画面に出す「現在の提供状況」。事業ページの上部・事業の一覧・会社ページ・比較一覧・検索で同じものを使う。
 * 過去の出来事（譲渡・名称変更・販売終了の発表など）は pastLine で別に出す。
 * クライアントからも使うので fs を読まない。
 */
type S = {
  status: string;
  stage?: string;
  kind?: string;
  suspension?: { temporary?: boolean };
  plannedEnd?: { kind: string; confirmedAt?: string };
  saleEnded?: { maintenance: string; date?: string; maintenanceEndAnnounced?: string };
  pastEvents?: { date: string; text: string }[];
  endedAt?: string;
  after?: { event: string };
};

export const statusLabel = (s: S) => {
  if (s.kind === 'contract') return s.status === '提供中' ? '契約中' : s.status === '不明' ? '契約の状況未確認' : '契約終了';
  if (s.kind === 'group') return '事業群（製品ごとに状態を表示）';
  if (s.suspension?.temporary) return '一時停止中';
  if (s.saleEnded) return s.saleEnded.maintenance === '継続' ? '販売終了・保守継続' : s.saleEnded.maintenance === '終了' ? '提供終了' : '販売終了（保守の状況は未確認）';
  if (s.status === '提供中' && s.plannedEnd && !s.plannedEnd.confirmedAt) return `提供中（${s.plannedEnd.kind}予定）`;
  // 承認取得だけを確かめ、販売・提供の状況が分からないもの（発売前とは書かない）
  if (s.status === '不明') return s.stage ? `${s.stage}／提供状況未確認` : '提供状況未確認';
  return s.status;
};

/** バッジの色の区分（st-xxx） */
export const statusClass = (s: S) => (s.kind === 'group' ? 'group' : s.saleEnded ? (s.saleEnded.maintenance === '終了' ? '終了' : '販売終了') : s.status);

const ym = (d: string) => d.replace(/^(\d{4})-(\d{2}).*$/, (_, y, m) => `${y}年${Number(m)}月`).replace(/^(\d{4})$/, '$1年');
/** 過去の出来事を1行で（例：「2022年3月に事業譲渡」）。無ければ空 */
export const pastLine = (s: S) => {
  const ev = (s.pastEvents ?? []).map((e) => `${e.date ? `${ym(e.date)}に` : ''}${e.text}`);
  if (s.saleEnded?.date) ev.push(`${ym(s.saleEnded.date)}に新規販売を終了`);
  if (s.saleEnded?.maintenanceEndAnnounced) {
    // 期日がまだ来ていなければ「予定」、過ぎていて終了を確かめていなければ「実施は未確認」（状態は自動で切り替えない）
    const due = s.saleEnded.maintenanceEndAnnounced;
    const future = due.slice(0, 7) > new Date().toISOString().slice(0, 7);
    ev.push(s.saleEnded.maintenance !== '終了' && future ? `保守は${ym(due)}に終える予定と公表` : `保守終了の公表期日は${ym(due)}${s.saleEnded.maintenance === '終了' ? '' : '（実施は未確認）'}`);
  }
  if (s.endedAt && !s.saleEnded && ['終了', '譲渡', '統合', '休止'].includes(s.status)) ev.push(`${ym(s.endedAt)}に${s.after?.event ?? (s.status === '譲渡' ? '事業譲渡' : s.status === '統合' ? '統合' : s.status === '休止' ? '休止' : '提供を終了')}`);
  return ev.join('／');
};
