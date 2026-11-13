#!/usr/bin/env node
/**
 * 止まった事業の「理由の出どころ」を endReasonNote の書き方から分ける（入っていない事業だけ）。
 *   会社の説明：当事者の発表・説明・告知・開示
 *   報道：報道・記事による
 *   推定：DB 側の判断を含む（記事が指す事業を推定した など）。endReasonCaveat に断り書きを入れる
 *   非公表：理由が公表されていない
 *   経過のみ：理由ではなく、合併・承継などの経過だけが分かっている
 * 1つの事業に複数つくことがある（社長の説明と報道の両方 など）。
 *   node scripts/classify-end-basis.mjs [--force]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const F = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'data', 'services.json');
const list = JSON.parse(fs.readFileSync(F, 'utf8'));
const force = process.argv.includes('--force');
const STOPPED = new Set(['終了', '譲渡', '統合', '休止']);
const INFER = /明記はなく|指すと判断|と推定|推測|とみられ|と考えられ|可能性がある|のではないか/;
const COMPANY = /説明|発表|告知|お知らせ|公表|開示|としている|と述べ|方針|理由に挙げ|目的に挙げ|「[^」]+」(と|として)/;
const PRESS = /報道|報じ|によると|によれば|記事|日経/;

const count = {};
let n = 0;
for (const s of list) {
  if (!STOPPED.has(s.status) || s.suspension?.temporary) continue;
  if (s.endReasonBasis && !force) continue;
  const t = s.endReasonNote ?? '';
  const b = [];
  // 止まった理由が unknown（終了の告知はあるが理由は書いていない など）は「非公表」
  if (!t.trim() || (s.endReasons ?? []).every((r) => r === 'unknown')) b.push('非公表');
  else {
    if (COMPANY.test(t.replace(/報じられ[^。]*。/g, ''))) b.push('会社の説明');
    if (PRESS.test(t)) b.push('報道');
    if (INFER.test(t)) b.push('推定');
    if (!b.length) b.push((s.endReasons ?? []).every((r) => r === 'unknown') ? '非公表' : '経過のみ');
  }
  s.endReasonBasis = b;
  // 推定を含むときは、その文を断り書きとして別に持つ（一覧でも見えるように）
  if (b.includes('推定') && !s.endReasonCaveat) s.endReasonCaveat = t.split('。').filter((x) => INFER.test(x)).map((x) => x.trim() + '。').join('');
  b.forEach((k) => (count[k] = (count[k] ?? 0) + 1));
  n++;
}
fs.writeFileSync(F, JSON.stringify(list, null, 2) + '\n');
console.error(`${n} 件に理由の出どころを入れた`, count);
