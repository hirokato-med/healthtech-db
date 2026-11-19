/**
 * 海外企業の表示に使う言葉と判定（海外企業のページと検索の索引 scripts/build-search-index.mjs で同じものを使う）。
 * 検索の索引づくりは node で直接読むので、型だけの import 以外は書かない。
 */
import type { Overseas, OverseasClaim } from './types';

/** 国名（データは英語のまま持ち、画面では日本語にする） */
export const COUNTRY_JA: Record<string, string> = {
  'United States': 'アメリカ',
  Canada: 'カナダ',
  'United Kingdom': 'イギリス',
  Germany: 'ドイツ',
  France: 'フランス',
  Switzerland: 'スイス',
  Finland: 'フィンランド',
  Israel: 'イスラエル',
  India: 'インド',
  China: '中国',
  Singapore: 'シンガポール',
  Indonesia: 'インドネシア',
  Philippines: 'フィリピン',
};
export const countryJa = (c: string) => COUNTRY_JA[c] ?? c;

/** 地域の見出し（US にはカナダの会社も入るので「北米」） */
export const REGION_JA: Record<string, string> = { US: '北米', EU: 'ヨーロッパ', ASIA: 'アジア' };

/** 当時の調査メモの領域タグ（英語・略語のものを日本語に。同じ意味のものは同じ言葉にする） */
const AREA_JA: Record<string, string> = {
  'Clinic Chain': 'クリニックチェーン',
  DMP: 'データ管理基盤（DMP）',
  EHR: '電子カルテ（EHR）',
  Telemedicine: '遠隔診療',
  D2C: '消費者への直接販売（D2C）',
  Fitness: 'フィットネス',
  'Smart Fitness': 'スマートフィットネス',
  'Online Medicine': 'オンライン医療',
  'Web Media': 'ウェブメディア',
  Security: 'セキュリティ',
  'First Consultation': '受診前の相談',
  'Development tool': '開発ツール',
};
export const areasJa = (areas: string[]) => [...new Set(areas.map((a) => AREA_JA[a] ?? a))];

/** 上場・資本の状態ごとに、それを支える主張の種類 */
export const STATE_KEYS: Record<string, OverseasClaim['key'][]> = { 上場: ['listing'], 買収: ['acquisitionCompleted'], 事業譲渡: ['assetAcquisition'], 閉鎖: ['closure', 'bankruptcy'], 上場廃止: ['delisting'] };

/** 状態がまだ確かめられていないときの言い方（何が未確認かを書く） */
export const STATE_UNCONFIRMED: Record<string, string> = { 上場: '上場は未確認', 買収: '買収の完了は未確認', 事業譲渡: '事業譲渡は未確認', 閉鎖: '閉鎖したかは未確認', 上場廃止: '上場廃止は未確認' };

type StateResult = { ok: true; claims: OverseasClaim[] } | { ok: false; claims: OverseasClaim[]; agreement?: OverseasClaim[] };

/** 状態の主張：確定（confirmed）があるか。買収は完了の主張がなく合意だけなら「合意のみ」 */
export const stateOf = (o: Pick<Overseas, 'listing' | 'claimList'>): StateResult | null => {
  const cl = o.claimList ?? [];
  const keys = STATE_KEYS[o.listing ?? ''];
  if (!keys) return null;
  const hit = cl.filter((x) => keys.includes(x.key));
  const ok = hit.filter((x) => x.status === 'confirmed');
  if (ok.length) return { ok: true, claims: ok };
  if (o.listing === '買収') {
    const ag = cl.filter((x) => x.key === 'acquisitionAgreement' && x.status === 'confirmed');
    if (ag.length) return { ok: false, agreement: ag, claims: hit };
  }
  return { ok: false, claims: hit };
};

/** いまの提供状況の主張（主張ごとの照合がある会社だけ） */
export const activityClaim = (o: Pick<Overseas, 'claimList'>) => o.claimList?.find((x) => x.key === 'activity');

/** いまの提供状況が分かっていないか（資料がない、または確かめた結果も「不明」） */
export const activityUnknown = (o: Pick<Overseas, 'claimList' | 'activity'>) => {
  const a = activityClaim(o);
  return !a || a.status === 'unverified' || o.activity === '不明' || /^不明|未確認/.test(a.value);
};

/**
 * 検索結果に出す状態のバッジ。確かめていないことは確定の言葉にしない。
 * 上場・資本の状態と、いまの提供状況は別々に判定する。
 */
export const overseasStatus = (o: Pick<Overseas, 'listing' | 'claimList' | 'activity'>) => {
  const parts: string[] = [];
  const st = stateOf(o);
  const STATE_WORD: Record<string, string> = { 買収: '買収済み', 事業譲渡: '事業譲渡', 閉鎖: '閉鎖', 上場廃止: '上場廃止' };
  if (st && o.listing && STATE_WORD[o.listing]) parts.push(st.ok ? STATE_WORD[o.listing] : st.agreement ? '買収で合意（完了は未確認）' : STATE_UNCONFIRMED[o.listing]);
  const a = activityClaim(o);
  if (a) {
    if (activityUnknown(o)) parts.push('提供状況未確認');
    else if (o.activity === '事業終了' && !(st?.ok && o.listing === '閉鎖')) parts.push(a.status === 'confirmed' ? '事業終了' : '事業終了（参考・未照合）');
  }
  return parts.join('・');
};
