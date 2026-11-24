/**
 * 画面に出す「現在の提供状況」。事業ページの上部・事業の一覧・会社ページ・比較一覧・検索で同じものを使う。
 * 過去の出来事（譲渡・名称変更・販売終了の発表など）は pastLine で別に出す。
 * クライアントからも使うので fs を読まない。
 */
// ym.ts と同じ書き方（node のスクリプトからも読むので、ここでは import しない）
const THIS_MONTH = new Date().toISOString().slice(0, 7);
const ymFull = (d?: string) =>
  d
    ? d.replace(/^(\d{4})-(\d{2}).*$/, (_, y, m) => `${y}年${Number(m)}月`).replace(/^(\d{4})$/, '$1年').replace(/^(\d{4})-(春|夏|秋|冬)$/, '$1年$2') + (/^\d{4}(-\d{2})?/.test(d) && d.slice(0, 7) > THIS_MONTH ? '（予定）' : '')
    : '';

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

export const STOPPED = ['終了', '譲渡', '統合', '休止'];
/** 止まった事業か。障害・不正アクセスによる一時停止（suspension.temporary）は入れない */
export const isStopped = (s: { status: string; kind?: string; suspension?: { temporary?: boolean } }) => s.kind !== 'group' && s.kind !== 'contract' && STOPPED.includes(s.status) && !s.suspension?.temporary;

/**
 * 準備中の段階のうち、開発が続いているかを確かめられないもの（治験中止・治験終了で次の段階が未確認・発表のみ）。
 * 「準備中」と言い切らず「開発状況未確認」として出し、段階の目盛りも付けない。
 */
export const isStalledStage = (stage?: string) => !!stage && /中止|治験終了|次の段階は未確認|発表のみ|発売を確認できない|継続は未確認/.test(stage);
const devUnconfirmed = (s: S) => s.status === '準備中' && isStalledStage(s.stage);

export const statusLabel = (s: S) => {
  if (s.kind === 'contract') return s.status === '提供中' ? '契約中' : s.status === '不明' ? '契約の状況未確認' : '契約終了';
  if (s.kind === 'group') return '事業群（製品ごとに状態を表示）';
  if (s.suspension?.temporary) return '一時停止中';
  if (s.saleEnded) return s.saleEnded.maintenance === '継続' ? '販売終了・保守継続' : s.saleEnded.maintenance === '終了' ? '提供終了' : '販売終了（保守の状況は未確認）';
  if (s.status === '提供中' && s.plannedEnd && !s.plannedEnd.confirmedAt) return `提供中（${s.plannedEnd.kind}予定）`;
  // 治験中止・治験終了などで、開発が続いているかを確かめられないもの
  if (devUnconfirmed(s)) return `${s.stage!.replace(/（.*$/, '')}／開発状況未確認`;
  // 承認取得だけを確かめ、販売・提供の状況が分からないもの（発売前とは書かない）
  if (s.status === '不明') return s.stage ? `${s.stage}／提供状況未確認` : '提供状況未確認';
  return s.status;
};

/** バッジの色の区分（st-xxx） */
export const statusClass = (s: S) =>
  s.kind === 'group' ? 'group' : s.saleEnded ? (s.saleEnded.maintenance === '終了' ? '終了' : '販売終了') : devUnconfirmed(s) ? '不明' : s.status;

/**
 * 絞り込みの区分。表示のラベル（statusLabel）と同じ考え方で分ける。
 * 一時停止は「休止」に入れず、開発状況未確認は「準備中」に入れない。
 */
export const STATUS_GROUPS = ['提供中', '準備中', '開発状況未確認', '提供状況未確認', '一時停止中', '終了', '譲渡', '統合', '休止', '事業群', '契約'] as const;
export const statusGroup = (s: S): (typeof STATUS_GROUPS)[number] => {
  // 事業群・契約は製品の件数に重ねない（それぞれの区分に分ける）
  if (s.kind === 'group') return '事業群';
  if (s.kind === 'contract') return '契約';
  if (s.suspension?.temporary) return '一時停止中';
  if (devUnconfirmed(s)) return '開発状況未確認';
  if (s.status === '不明') return '提供状況未確認';
  return s.status as (typeof STATUS_GROUPS)[number];
};

/** 開始時期の表示。「2024-秋」→「2024年秋」、「1960年代」はそのまま。年だけなら「2020年」 */
export const startText = (s: { startedAt?: string; startedYear?: number | null }) =>
  s.startedAt ? ymFull(s.startedAt) : s.startedYear ? `${s.startedYear}年` : '';

/**
 * 期間の表示（開始〜終了）。分からない側は「未確認」と書き、空にしない。
 * 止まった事業で終了日がないときは「終了時期未確認」。終了日は自動では入れない（記録された endedAt だけ）。
 * year: true なら年だけ（「2020年〜2023年」）
 */
export const periodText = (
  s: { status: string; suspension?: { temporary?: boolean }; startedAt?: string; startedYear?: number | null; endedAt?: string; knownSince?: string },
  opt: { year?: boolean } = {},
) => {
  const y = (d?: string) => (d ? (/^\d{4}(-|$)/.test(d) ? `${d.slice(0, 4)}年` : d) : '');
  const a = opt.year ? (s.startedAt ? y(s.startedAt) : s.startedYear ? `${s.startedYear}年` : '') : startText(s);
  const b = opt.year ? y(s.endedAt) : ymFull(s.endedAt);
  const stopped = isStopped(s);
  const start = a || (s.knownSince ? `開始時期未確認（${opt.year ? y(s.knownSince) : ymFull(s.knownSince)}には提供）` : '開始時期未確認');
  if (b) return `${start}〜${b}`;
  if (stopped) return `${start}〜終了時期未確認`;
  return a ? `${a}〜` : start;
};

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
