#!/usr/bin/env node
/**
 * 止まった事業の「理由の出どころ」を、性質の違う3つの項目に分けて入れる（endReasonInfo）。
 *   sources        情報源：会社発表／行政資料／報道（複数つくことがある）
 *   stated         理由の記載：明示あり／経過だけ／非公表（会社が明示）／資料に理由なし
 *   interpretation 編集上の解釈：なし／推定を含む（推定を含むときは endReasonCaveat に断り書き）
 * あわせて、止まったあとどうなったか（after）を入れる：出来事（法人合併・事業譲渡・株式譲渡・販売終了 など）と
 * サービスの扱い（同一サービス継続／別サービスへ移行／一部継続／提供終了／未確認）を分け、確認時点を残す。
 * 手で直した事業（endReasonInfo.locked・afterLocked）は変えない。
 *   node scripts/classify-end-basis.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const F = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'data', 'services.json');
const list = JSON.parse(fs.readFileSync(F, 'utf8'));
const companies = JSON.parse(fs.readFileSync(path.join(path.dirname(F), 'companies.json'), 'utf8'));
const coHp = new Map(companies.map((c) => [c.id, c.hp]));
// 事業の会社欄（「株式会社NTTドコモ」「A → B」など）に名前が出てくる会社と、その親会社の公式サイト
const nm = (x = '') => x.normalize('NFKC').replace(/株式会社|有限会社|合同会社|ホールディングス|グループ|\s/g, '').toLowerCase();
const named = companies.filter((c) => c.hp && nm(c.name).length >= 2).map((c) => ({ key: nm(c.name), hp: c.hp, parent: c.parentCompany }));
const ownHosts = (s) => {
  const t = nm(s.company);
  const hit = named.filter((c) => t.includes(c.key));
  const parents = hit.map((c) => c.parent).filter(Boolean).map(nm);
  return [...hit.map((c) => c.hp), ...named.filter((c) => parents.includes(c.key)).map((c) => c.hp)];
};
const STOPPED = new Set(['終了', '譲渡', '統合', '休止']);
const INFER = /明記はなく|指すと判断|と推定|推測|とみられ|と考えられ|可能性がある|のではないか/;
const PRESS = /報道|報じ|によると|によれば|記事|日経|新聞/;
const GOV = /厚生労働省|厚労省|省令|官報|告示|通知を出|自治体|PMDA|FDA|規制当局|法改正|薬事法/;
const COMPANY = /説明|発表|告知|お知らせ|公表|開示|としている|と述べ|方針|掲げ|理由に挙げ|目的に挙げ|として[^。]{0,40}(譲渡|終了|撤退|統合|承継|売却|移管)|「[^」]+」(と|として)/;
const NONDISCLOSED = /非公表とし|明らかにしていない|開示していない|コメントを控え|理由は非公表|理由を明らかにせず/;
const REASON = /ため|として|判断|方針|目的|集中|困難|不振|赤字|採算|伸び悩|見直し|戦略|再編|効率|需要|競合|規制|資金|不足|減少|低迷|成長/;

const today = new Date().toISOString().slice(0, 10);
const LABEL = { regulation: '規制・承認', reimbursement: '保険償還・診療報酬', 'no-payer': 'お金を払う人がいない', workflow: '現場に定着しない', evidence: '効果を示せない', funding: '資金が続かない', 'parent-strategy': '親会社の方針', acquisition: '買収・統合', competition: '競合・大手の参入', team: '体制の問題', infrastructure: '通信・部品の終了', 'business-viability': '事業性・採算', 'service-restructuring': 'サービス再編' };
// 資料の発信主体：会社自身（自社サイト・プレスリリース配信・適時開示）／行政／信用調査会社／報道
const host = (u) => { try { return new URL(u).hostname.replace(/^www\d?\./, ''); } catch { return ''; } };
const MEDIA = /(nikkei|asahi|yomiuri|mainichi|sankei|jiho|mixonline|itmedia|impress|watch\.impress|m3\.com|medical-tribune|mobihealthnews|techcrunch|thebridge|bridge\.jp|maonline|nihon-ma|cnet|ascii|newswitch|yakuji|nissin|kyodo|jiji|toyokeizai|diamond|president|businessinsider|forbes|gemmed|cbnews|medifax|iotnews|smart-fc|platinumpartners|tsujigawa|kabutan|minkabu|zaikei|irbank)/;
const OWN_DIST = /(^|\.)(prtimes\.jp|atpress\.ne\.jp|value-press\.com|jpx\.co\.jp|release\.tdnet\.info|kabupro\.jp|businesswire\.com|prnewswire\.com|dreamnews\.jp|news2u\.net|apps\.apple\.com|play\.google\.com)$/;
const publisherOf = (u, s) => {
  const h = host(u);
  if (!h) return '報道';
  if (/\.go\.jp$|\.lg\.jp$|metro\.tokyo|pref\.|city\./.test(h)) return '行政資料';
  if (/(^|\.)(tdb\.co\.jp|tsr-net\.co\.jp)$/.test(h)) return '信用調査';
  // 事業の公式サイト・会社の公式サイト（企業DB）・手で足した自社ドメイン
  const own = [s.hp, coHp.get(s.companyId), ...ownHosts(s), ...(s.ownDomains ?? [])].map(host).filter(Boolean);
  if (OWN_DIST.test(h) || own.some((d) => h === d || h.endsWith('.' + d) || d.endsWith('.' + h))) return '会社発表';
  // 会社名の英字がドメインに入っている（sogo-medical.co.jp など）
  const roman = (s.company ?? '').normalize('NFKC').toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? [];
  if (roman.some((r) => h.replace(/-/g, '').includes(r.replace(/-/g, '')))) return '会社発表';
  // 企業DBに無い会社（大手の事業部など）：会社のサイトの発表ページの形（報道サイトは除く）
  const p = (() => { try { return new URL(u).pathname; } catch { return ''; } })();
  if (!MEDIA.test(h) && (/news_?release|newsrelease|press_?release|\/press\/|\/ir\/|\/release\/|\/info\/notice/.test(p) || (/\.(co\.jp|ne\.jp|or\.jp|com)$/.test(h) && /^\/(ja\/|jp\/|corporate\/)?(news|topics|information)\//.test(p)))) return '会社発表';
  return '報道';
};
// 理由のカテゴリを、資料の説明が直接支えているか（書かれていれば支えている）
const SUPPORT = {
  regulation: /規制|承認|薬機法|薬事法|医療法|医師法|景品表示法|措置命令|省令|許可|法改正|違反|行政指導|ガイドライン/,
  reimbursement: /保険|診療報酬|償還|点数|算定/,
  'no-payer': /払|課金|単価|有料|収益化|顧客|売上|需要|利用者数|会員数|価格/,
  workflow: /定着|使われ|現場|業務|運用|利用が(広が|進|伸)|普及/,
  evidence: /有意差|効果|治験|臨床|エビデンス|評価項目/,
  funding: /資金|調達|資金繰り|破産|負債|借入|民事再生/,
  'parent-strategy': /親会社|グループ|選択と集中|集中|方針|ノンコア|中期経営計画|戦略|経営資源/,
  acquisition: /買収|統合|合併|譲渡|承継|子会社/,
  competition: /競合|参入|競争|大手|他社/,
  team: /創業者|離脱|体制|人材|代表|体調|不正/,
  infrastructure: /3G|停波|部品|供給停止|生産終了|サービス終了に伴|提供終了に伴|仕様変更/,
  'business-viability': /事業性|採算|収益性|継続が困難|継続困難|赤字|コスト|不採算/,
  'service-restructuring': /再編|リニューアル|移行|一本化|統合|後継|刷新|LINE/,
};
const count = { sources: {}, stated: {}, interpretation: {}, fate: {} };
const inc = (k, v) => (count[k][v] = (count[k][v] ?? 0) + 1);
for (const s of list) {
  if (!STOPPED.has(s.status) || s.suspension?.temporary) { delete s.endReasonBasis; continue; }
  delete s.endReasonBasis;
  const t = s.endReasonNote ?? '';
  const unknown = !(s.endReasons ?? []).some((r) => r !== 'unknown');
  if (!s.endReasonInfo?.locked) {
    // 情報源は文の言い回しではなく、載せている資料の発信主体から決める（会社自身の発表／行政／信用調査／報道）
    const kinds = new Set((s.sources ?? []).map((u) => publisherOf(u, s)));
    const sources = [];
    const says = COMPANY.test(t.replace(/[^。]*報じ[^。]*。/g, ''));
    if (kinds.has('会社発表') && (says || !PRESS.test(t))) sources.push('会社発表');
    if (kinds.has('行政資料') && GOV.test(t)) sources.push('行政資料');
    if (kinds.has('信用調査') || /帝国データバンク|東京商工リサーチ/.test(t)) sources.push('信用調査');
    if (kinds.has('報道') && (PRESS.test(t) || !sources.length)) sources.push('報道');
    const stated = unknown ? (NONDISCLOSED.test(t) ? '非公表（会社が明示）' : '理由を確認できていない') : REASON.test(t) ? '明示あり' : '経過だけ';
    // 理由のカテゴリが、資料の説明に直接書かれているか。書かれていないカテゴリは編集上の推定として扱う
    const inferred = (s.endReasons ?? []).filter((r) => r !== 'unknown' && SUPPORT[r] && !SUPPORT[r].test(t));
    s.endReasonInfo = { sources, stated, interpretation: INFER.test(t) || s.endReasonCaveat || inferred.length ? '推定を含む' : 'なし', ...(inferred.length ? { inferred } : {}) };
  }
  if (s.endReasonInfo.interpretation === '推定を含む' && !s.endReasonCaveatLocked) {
    const parts = t.split('。').filter((x) => INFER.test(x)).map((x) => x.trim() + '。');
    if (s.endReasonInfo.inferred?.length) parts.push(`理由の分類のうち「${s.endReasonInfo.inferred.map((r) => LABEL[r] ?? r).join('」「')}」は、資料に直接の記載がなく、この DB が説明から分類したもの。`);
    s.endReasonCaveat = parts.join('');
  } else if (!s.endReasonCaveatLocked) delete s.endReasonCaveat;
  // 止まったあと。法人の合併・譲渡という「出来事」と、サービスがどうなったか（fate）を分けて持つ。
  // fate は本文に書かれているときだけ決め、書かれていなければ「未確認」（合併先があるだけで、後継サービスへ移ったとはしない）
  if (!s.afterLocked) {
    const all = [t, s.successor ?? '', s.description ?? '', ...(s.milestones ?? []).slice(-3).map((m) => m.text)].join(' ');
    const event = s.status === '統合' ? (/吸収合併|合併/.test(all) ? '法人合併' : 'サービス統合')
      : s.status === '譲渡' ? (/全株式|株式(を)?(譲渡|取得)|子会社化/.test(all) ? '株式譲渡（運営会社ごと移る）' : /吸収分割|新設分割|事業譲渡|承継|会社分割/.test(all) ? '事業譲渡' : '譲渡')
      : s.status === '終了' ? (/製造販売|販売(を|の)?終了|開発・販売/.test(all) ? '販売終了' : '提供終了') : '休止';
    let fate = '未確認', fateNote;
    const keep = /(製品|サービス|事業|アプリ)(自体)?は(終了していない|継続)|運営(を|で)継続|として継続|製品として継続|引き続き提供|提供を続けて|サイト[^。]{0,30}公開されている|事業自体は[^。]{0,10}継続/;
    const move = /(へ|に)(移行|一本化)|に統合(した|され|する|し)|へ統合/;
    const maint = all.match(/(保守|サポート)[^。]{0,25}?(\d{4})年(\d{1,2})月(末)?まで/);
    if (maint) {
      const until = `${maint[2]}-${String(maint[3]).padStart(2, '0')}`;
      if (until < today.slice(0, 7)) { fate = '提供終了'; fateNote = `販売終了のあとも既存顧客の${maint[1]}を${maint[2]}年${Number(maint[3])}月${maint[4] ?? ''}まで続けた（終了済み）`; }
      else { fate = '一部継続'; fateNote = `既存顧客の${maint[1]}は${maint[2]}年${Number(maint[3])}月${maint[4] ?? ''}まで続ける予定`; }
    } else if (s.status === '休止') fate = '休止中';
    else if (keep.test(all) && (s.status === '譲渡' || s.status === '統合')) fate = '同一サービス継続（運営会社が変更）';
    else if (move.test(all) && s.successor) fate = '別サービスへ移行';
    else if (s.status === '終了') fate = '提供終了';
    s.after = { event, fate, ...(fateNote ? { note: fateNote } : {}), asOf: s.updatedAt ?? today.slice(0, 7) };
  }
  delete s.afterEnd; delete s.afterEndLocked;
  s.endReasonInfo.sources.forEach((v) => inc('sources', v));
  inc('stated', s.endReasonInfo.stated); inc('interpretation', s.endReasonInfo.interpretation);
  if (s.after) inc('fate', s.after.fate);
}
fs.writeFileSync(F, JSON.stringify(list, null, 2) + '\n');
console.error(JSON.stringify(count, null, 1));
