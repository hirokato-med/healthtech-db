#!/usr/bin/env node
/**
 * 止まった事業の「理由の出どころ」を、性質の違う3つの項目に分けて入れる（endReasonInfo）。
 *   sources        情報源：会社発表／行政資料／報道（複数つくことがある）
 *   stated         理由の記載：明示あり／経過だけ／非公表（会社が明示）／資料に理由なし
 *   interpretation 編集上の解釈：なし／推定を含む（推定を含むときは endReasonCaveat に断り書き）
 * あわせて、止まったあとどうなったか（afterEnd）を入れる：提供継続・運営主体変更／後継サービスへ移行／一部継続／提供終了
 * 手で直した事業（endReasonInfo.locked）は変えない。
 *   node scripts/classify-end-basis.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const F = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'data', 'services.json');
const list = JSON.parse(fs.readFileSync(F, 'utf8'));
const STOPPED = new Set(['終了', '譲渡', '統合', '休止']);
const INFER = /明記はなく|指すと判断|と推定|推測|とみられ|と考えられ|可能性がある|のではないか/;
const PRESS = /報道|報じ|によると|によれば|記事|日経|新聞/;
const GOV = /厚生労働省|厚労省|省令|官報|告示|通知を出|自治体|PMDA|FDA|規制当局|法改正|薬事法/;
const COMPANY = /説明|発表|告知|お知らせ|公表|開示|としている|と述べ|方針|掲げ|理由に挙げ|目的に挙げ|として[^。]{0,40}(譲渡|終了|撤退|統合|承継|売却|移管)|「[^」]+」(と|として)/;
const NONDISCLOSED = /非公表とし|明らかにしていない|開示していない|コメントを控え|理由は非公表|理由を明らかにせず/;
const REASON = /ため|として|判断|方針|目的|集中|困難|不振|赤字|採算|伸び悩|見直し|戦略|再編|効率|需要|競合|規制|資金|不足|減少|低迷|成長/;

const count = { sources: {}, stated: {}, interpretation: {}, afterEnd: {} };
const inc = (k, v) => (count[k][v] = (count[k][v] ?? 0) + 1);
for (const s of list) {
  if (!STOPPED.has(s.status) || s.suspension?.temporary) { delete s.endReasonBasis; continue; }
  delete s.endReasonBasis;
  const t = s.endReasonNote ?? '';
  const unknown = !(s.endReasons ?? []).some((r) => r !== 'unknown');
  if (!s.endReasonInfo?.locked) {
    const companyPart = t.replace(/[^。]*報じ[^。]*。/g, '');
    const sources = [];
    if (COMPANY.test(companyPart)) sources.push('会社発表');
    if (GOV.test(t)) sources.push('行政資料');
    if (PRESS.test(t)) sources.push('報道');
    const stated = unknown ? (NONDISCLOSED.test(t) ? '非公表（会社が明示）' : '資料に理由なし') : REASON.test(t) ? '明示あり' : '経過だけ';
    // 理由が明示されていて出どころの書き方が無いもの：報道の印が無ければ当事者の発表をまとめたもの
    if (!sources.length && stated === '明示あり') sources.push('会社発表');
    s.endReasonInfo = { sources, stated, interpretation: INFER.test(t) || s.endReasonCaveat ? '推定を含む' : 'なし' };
  }
  if (s.endReasonInfo.interpretation === '推定を含む' && !s.endReasonCaveat) s.endReasonCaveat = t.split('。').filter((x) => INFER.test(x)).map((x) => x.trim() + '。').join('');
  // 止まったあと：譲渡でサービスが続いている、後継に移った、保守だけ続く など（事業の失敗と誤読されないように）
  if (!s.afterEndLocked) {
    const all = [t, s.successor ?? '', s.description ?? ''].join(' ');
    s.afterEnd = s.status === '譲渡' && /継続|続いて|続けて|引き継|承継|公開されている|提供を続/.test(all) && !/閉鎖した|提供を終了した|サービスを終了/.test(t) ? '提供継続・運営主体変更'
      : s.status === '統合' && s.successor ? (/一部/.test(all) ? '一部を後継サービスへ統合' : '後継サービスへ移行')
      : s.status === '終了' && /(サポート|保守)[^。]{0,30}(継続|続け|まで)/.test(all) ? '一部継続（既存顧客の保守など）'
      : s.status === '終了' ? '提供終了' : s.status === '譲渡' ? '運営主体変更' : undefined;
    if (!s.afterEnd) delete s.afterEnd;
  }
  s.endReasonInfo.sources.forEach((v) => inc('sources', v));
  inc('stated', s.endReasonInfo.stated); inc('interpretation', s.endReasonInfo.interpretation);
  if (s.afterEnd) inc('afterEnd', s.afterEnd);
}
fs.writeFileSync(F, JSON.stringify(list, null, 2) + '\n');
console.error(JSON.stringify(count, null, 1));
