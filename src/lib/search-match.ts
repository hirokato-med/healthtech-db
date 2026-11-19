/**
 * サイト内検索の当てはめ（検索ページと scripts/test-search.mjs で同じものを使う）。
 * 同じ意味の言葉（DTx・デジタル治療・治療用アプリ など）は、どれで検索しても同じものが出るようにする。
 */
export type SearchItem = { t: string; id: string; title: string; sub: string; url: string; k?: string; ty?: string; sec?: 'support' | 'related' | 'contract' | 'uses' | 'group'; st?: string };
/** 検索結果の区分：検索語そのもの／開発・薬事・販売の支援サービス／同じ分野の関連する事業 */
export type Section = 'main' | 'support' | 'related' | 'contract' | 'uses' | 'group';

type SynGroup = { terms: string[]; weak?: string[]; needs?: RegExp; exclude?: RegExp };
// 同じ意味として扱う言葉。exclude は、言葉は含むが意味の違うもの（歯科ソフトの「DTX Studio」など）
// weak は、needs の言葉も一緒にあるときだけ同じ意味として扱う言葉（「読影支援」は人が読影するサービスにも使うので、AI の文字があるときだけ）。
// weak の言葉そのもので探したときは、言葉どおりに探す
const AI = /ai(?![a-z])|人工知能|深層学習|ディープラーニング|機械学習/;
export const SYNONYMS: SynGroup[] = [
  // DTx は「治療用アプリ」そのものに限る。睡眠・メンタルなど分野が同じだけのアプリは「関連する事業」に分ける
  { terms: ['dtx', 'デジタル治療', 'デジタルセラピューティクス', 'デジタル療法', '治療用アプリ', '治療アプリ', '治療用プログラム', '治療補助アプリ'], exclude: /dtx\s*studio/i },
  { terms: ['samd', 'プログラム医療機器', '医療機器プログラム'] },
  { terms: ['オンライン診療', '遠隔診療', 'telemedicine', 'テレメディシン', 'オンライン診察', 'オンラインピル診療'] },
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
  { terms: ['画像診断ai', '診断支援ai', 'ai診断支援', 'ai画像診断'], weak: ['画像診断支援', '読影支援', '検出支援'], needs: AI },
  { terms: ['m&a', '買収', '子会社化'] },
];

export const normText = (s: string) => s.normalize('NFKC').toLowerCase();
const groupOf = (t: string) => SYNONYMS.find((g) => g.terms.includes(t));
/** 文に、まとまりの言葉のどれかが入っているか（weak の言葉は名前・説明だけで見る。事業の種類の名前とは組み合わせない） */
const hasTerm = (g: SynGroup, text: string, weak = true) => g.terms.some((x) => text.includes(x)) || (weak && !!g.weak?.some((x) => text.includes(x)) && (!g.needs || g.needs.test(text)));

/**
 * 1件が検索語に当たるか。当たれば { score, related }、当たらなければ null。
 * 同じ意味の言葉のまとまりは、名前・説明だけで当てる。事業の種類の名前（ty）でしか当たらないものは related（関連する事業）にする。
 */
export const matchItem = (h: SearchItem, query: string): { score: number; section: Section } | null => {
  const n = normText(query.trim());
  if (!n) return null;
  const terms = n.split(/\s+/).filter(Boolean);
  const title = normText(h.title);
  const main = `${title} ${normText(h.sub)} ${normText(h.k ?? '')}`;
  const all = `${main} ${normText(h.ty ?? '')}`;
  let score = 0;
  let related = false;
  for (const t of terms) {
    const g = groupOf(t);
    // 検索語そのものが除外の名前（「DTX Studio」で探したとき）なら、言葉どおりに探す
    if (g && !g.exclude?.test(query)) {
      if (g.exclude?.test(h.title)) return null;
      if (hasTerm(g, main)) { if (hasTerm(g, title)) score += 2; }
      else if (hasTerm(g, all, false)) related = true;
      else return null;
    } else {
      if (!all.includes(t)) return null;
      if (title.includes(t)) score += 2;
    }
  }
  if (title === n) score += 3;
  // 同じ意味の言葉のまとまりで当たった支援サービスは、支援の区分に分ける
  const viaGroup = terms.some((t) => groupOf(t) && !groupOf(t)!.exclude?.test(query));
  return { score, section: h.sec === 'contract' ? 'contract' : related || (viaGroup && h.sec === 'related') ? 'related' : viaGroup && h.sec === 'support' ? 'support' : viaGroup && h.sec === 'uses' ? 'uses' : viaGroup && h.sec === 'group' ? 'group' : 'main' };
};

const run = (index: SearchItem[], query: string) =>
  index
    .map((h) => ({ h, m: matchItem(h, query) }))
    .filter((x): x is { h: SearchItem; m: { score: number; section: Section } } => x.m != null)
    .sort((a, b) => b.m.score - a.m.score);

/** 検索語に当たるもの（関連する事業は除く） */
export const search = (index: SearchItem[], query: string, limit = 100) => run(index, query).filter((x) => x.m.section === 'main').slice(0, limit).map((x) => x.h);
/** 提携・販売権の契約（製品そのものではない） */
export const searchContract = (index: SearchItem[], query: string, limit = 30) => run(index, query).filter((x) => x.m.section === 'contract').slice(0, limit).map((x) => x.h);
/** 開発・薬事・販売の支援サービス（DTx で探したときの SaMD 開発支援 など） */
export const searchSupport = (index: SearchItem[], query: string, limit = 50) => run(index, query).filter((x) => x.m.section === 'support').slice(0, limit).map((x) => x.h);
/** 検索語の分野と同じだが、その言葉そのものではないもの（DTx で探したときの睡眠アプリ など） */
export const searchRelated = (index: SearchItem[], query: string, limit = 50) => run(index, query).filter((x) => x.m.section === 'related').slice(0, limit).map((x) => x.h);
/** DTx などを使う診療・健康支援サービス（治療アプリを組み合わせたプログラム・法人向けの提供 など） */
export const searchUses = (index: SearchItem[], query: string, limit = 50) => run(index, query).filter((x) => x.m.section === 'uses').slice(0, limit).map((x) => x.h);
/** 複数の製品をまとめた会社の事業群（個別の製品へリンクする記録） */
export const searchGroup = (index: SearchItem[], query: string, limit = 30) => run(index, query).filter((x) => x.m.section === 'group').slice(0, limit).map((x) => x.h);
