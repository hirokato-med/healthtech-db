import type { Service } from './types';

type Biz = { name: string; since?: string; note?: string; url?: string };
export type ProfileBiz = Biz & { serviceId?: string };

const norm = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[（(][^）)]*[）)]/g, '').replace(/[「」『』\s・\-_.,、。'’"]/g, '');
// 開始時期についての作業メモ（「開始時期は未確認」「開始時期は公表なし」など）。事業ページの開始時期と食い違うので出さない
const SINCE_MEMO = /開始(時期|年)は?(未確認|公表なし|非公表|不明|特定できず)[^。、]*[。、]?\s*/g;

/**
 * 会社の「外形情報」の事業一覧を、事業データ（services.json）とそろえる。
 * 同じ事業が事業データにあれば、開始時期は事業データの値を使い、事業ページにつなぐ（ページの中で開始時期が食い違わないように）。
 */
export const reconcileBusinesses = (list: Biz[], services: Service[]): ProfileBiz[] =>
  list.map((b) => {
    const k = norm(b.name);
    // 名前が同じ → 事業の名前が一覧の名前に含まれる（長いもの優先）→ 一覧の名前を含む事業が1つだけ、の順で探す
    const ns = services.map((x) => ({ x, n: norm(x.name) }));
    const s = k.length < 2 ? undefined
      : ns.find((o) => o.n === k)?.x
        ?? ns.filter((o) => o.n.length >= 3 && k.includes(o.n)).sort((p, q) => q.n.length - p.n.length)[0]?.x
        ?? ((m) => (m.length === 1 && k.length >= 3 ? m[0].x : undefined))(ns.filter((o) => o.n.includes(k)));
    const since = s ? s.startedAt || (s.startedYear ? String(s.startedYear) : undefined) || b.since : b.since;
    const note = b.note?.replace(SINCE_MEMO, '').replace(/^[。、\s]+|[、\s]+$/g, '') || undefined;
    return { ...b, since, note, serviceId: s?.id };
  });
