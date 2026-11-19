/**
 * 表示用の日付。ビルドする環境のタイムゾーン（多くは UTC）に左右されないよう、いつも日本時間で日付を作る。
 * 日本には夏時間がないので、UTC に9時間足してから UTC の年月日を読めば日本時間の日付になる。
 * 「2026-10-23」のような日付だけの文字列は、そのままの日付として扱う（時刻の換算をしない）。
 */
const JST_OFFSET_MS = 9 * 3600e3;

/** 日本時間の年月日（数値）。読めないときは null */
const jstParts = (iso: string): { y: number; m: number; d: number } | null => {
  if (!iso) return null;
  const dateOnly = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) return { y: Number(dateOnly[1]), m: Number(dateOnly[2]), d: Number(dateOnly[3]) };
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const j = new Date(t + JST_OFFSET_MS);
  return { y: j.getUTCFullYear(), m: j.getUTCMonth() + 1, d: j.getUTCDate() };
};
const p2 = (n: number) => String(n).padStart(2, '0');

/** 日本時間の「YYYY-MM-DD」 */
export const jstYmd = (iso: string) => {
  const p = jstParts(iso);
  return p ? `${p.y}-${p2(p.m)}-${p2(p.d)}` : iso;
};
/** 一覧用の「2026.11.19」（日本時間） */
export const fmtDate = (iso: string) => {
  const p = jstParts(iso);
  return p ? `${p.y}.${p2(p.m)}.${p2(p.d)}` : iso;
};
/** 文中用の「2026年11月19日」（日本時間） */
export const fmtDateJa = (iso: string) => {
  const p = jstParts(iso);
  return p ? `${p.y}年${p.m}月${p.d}日` : iso;
};
