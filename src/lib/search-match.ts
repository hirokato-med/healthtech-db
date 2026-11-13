/**
 * サイト内検索の当てはめ（検索ページと scripts/test-search.mjs で同じものを使う）。
 * 同じ意味の言葉（DTx・デジタル治療・治療用アプリ など）は、どれで検索しても同じものが出るようにする。
 */
export type SearchItem = { t: string; id: string; title: string; sub: string; url: string; k?: string };

type SynGroup = { terms: string[]; exclude?: RegExp };
// 同じ意味として扱う言葉。exclude は、言葉は含むが意味の違うもの（歯科ソフトの「DTX Studio」など）
export const SYNONYMS: SynGroup[] = [
  { terms: ['dtx', 'デジタル治療', 'デジタルセラピューティクス', 'デジタル療法', '治療用アプリ', '治療アプリ', '治療用プログラム', '治療補助アプリ'], exclude: /dtx\s*studio/i },
  { terms: ['samd', 'プログラム医療機器', '医療機器プログラム'] },
  { terms: ['オンライン診療', '遠隔診療', 'telemedicine', 'テレメディシン'] },
  { terms: ['オンライン服薬指導', '遠隔服薬指導'] },
  { terms: ['phr', 'パーソナルヘルスレコード'] },
  { terms: ['電子カルテ', 'emr', 'ehr'] },
  { terms: ['問診', 'web問診', 'ai問診'] },
  { terms: ['治験', '臨床試験'] },
  { terms: ['dct', '分散型治験', '分散型臨床試験'] },
  { terms: ['見守り', 'みまもり'] },
  { terms: ['遺伝子検査', 'ゲノム検査', 'dna検査'] },
  { terms: ['フェムテック', 'femtech'] },
  { terms: ['ヘルスケアai', '医療ai', 'aiホスピタル'] },
  { terms: ['画像診断ai', '画像診断支援', '読影支援'] },
  { terms: ['m&a', '買収', '子会社化'] },
];

export const normText = (s: string) => s.normalize('NFKC').toLowerCase();
const groupOf = (t: string) => SYNONYMS.find((g) => g.terms.includes(t));

/** 1件が検索語に当たるか。当たれば点数（大きいほど上）、当たらなければ null */
export const matchItem = (h: SearchItem, query: string): number | null => {
  const n = normText(query.trim());
  if (!n) return null;
  const terms = n.split(/\s+/).filter(Boolean);
  const title = normText(h.title);
  const hay = `${title} ${normText(h.sub)} ${normText(h.k ?? '')}`;
  let score = 0;
  for (const t of terms) {
    const g = groupOf(t);
    // 検索語そのものが除外の名前（「DTX Studio」で探したとき）なら、言葉どおりに探す
    if (g && !g.exclude?.test(query)) {
      if (g.exclude?.test(h.title)) return null;
      if (!g.terms.some((x) => hay.includes(x))) return null;
      if (g.terms.some((x) => title.includes(x))) score += 2;
    } else {
      if (!hay.includes(t)) return null;
      if (title.includes(t)) score += 2;
    }
  }
  if (title === n) score += 3;
  return score;
};

export const search = (index: SearchItem[], query: string, limit = 100) =>
  index
    .map((h) => ({ h, score: matchItem(h, query) }))
    .filter((x): x is { h: SearchItem; score: number } => x.score != null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.h);
