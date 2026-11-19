/** 「2026-04」→「2026年4月」、「2026」→「2026年」、「2024-秋」→「2024年秋」。「1960年代」などはそのまま。まだ来ていない月には「（予定）」を付ける */
const THIS_MONTH = new Date().toISOString().slice(0, 7);
export const isFuture = (s?: string) => !!s && /^\d{4}(-\d{2})?/.test(s) && s.slice(0, 7) > THIS_MONTH;
export const ym = (s?: string) =>
  s
    ? s
        .replace(/^(\d{4})-(\d{2}).*$/, (_, y, m) => `${y}年${Number(m)}月`)
        .replace(/^(\d{4})$/, '$1年')
        .replace(/^(\d{4})-(春|夏|秋|冬)$/, '$1年$2') + (isFuture(s) ? '（予定）' : '')
    : '';
