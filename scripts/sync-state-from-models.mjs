#!/usr/bin/env node
/**
 * 事業のしくみ（business-models.json）の提供段階・事業活動から、事業ページ上部の記録（services.json の status・stage）をそろえる。
 * 上部・一覧・会社ページ・検索は status / stage / saleEnded / pastEvents から同じ表示を作る（src/lib/status.ts）。
 *   node scripts/sync-state-from-models.mjs [--dry]
 * 決まり（定義第2.5版）：
 * - 確認できないことを別の確定ラベルに変えない（承認取得だけなら「承認取得済み／提供状況未確認」、発売前とは書かない）
 * - 譲渡・運営会社の交代のあとも提供が続くなら status は「提供中」、譲渡は過去の出来事（pastEvents）
 * - 新規販売の終了は saleEnded（保守の継続／未確認／終了）。保守終了の公表期日だけでは終了にしない
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = (f) => path.join(ROOT, 'data', f);
const M = JSON.parse(fs.readFileSync(F('business-models.json'), 'utf8'));
const S = JSON.parse(fs.readFileSync(F('services.json'), 'utf8'));
const dry = process.argv.includes('--dry');

const PREP = {
  研究開発: '研究開発中',
  治験実施中: '治験中',
  '治験終了（次の段階は未確認）': '治験終了（次の段階は未確認）',
  '治験中止（開発の継続は未確認）': '治験中止（開発の継続は未確認）',
  '承認取得済み・発売準備中': '承認取得済み・発売準備中',
  '発表のみ（発売を確認できない）': '発表のみ（発売を確認できない）',
  '参加募集・準備中（まだ使えない）': '参加募集・準備中',
};
const changes = [];
for (const s of S) {
  const m = M[s.id];
  if (!m || s.kind === 'contract') continue;
  const st = m.stage?.value ?? '';
  const ac = m.activity?.value ?? '';
  const before = JSON.stringify([s.status, s.stage ?? null, s.saleEnded ?? null, s.kind ?? null]);
  if (m.recordKind === 'group') s.kind = 'group';
  else if (s.kind === 'group') delete s.kind;
  if (st in PREP) {
    // 治験中止など、開発が止まった可能性があるものも、終了を確かめるまでは準備中（段階に中止を書く）
    s.status = '準備中'; s.stage = PREP[st]; delete s.saleEnded;
  } else if (st === '承認取得済み・提供状況未確認') {
    s.status = '不明'; s.stage = '承認取得済み'; delete s.saleEnded;
  } else if (st === '提供状況未確認') {
    s.status = '不明'; delete s.stage; delete s.saleEnded;
  } else if (st === '一般提供' || st.startsWith('限定提供中')) {
    // 譲渡・運営会社の交代・名称変更のあとも続いているなら提供中（譲渡は過去の出来事に）
    if (!['中止・終了', '後継サービスへ移行'].includes(ac)) {
      if (['譲渡', '統合'].includes(s.status) && s.endedAt && !(s.pastEvents ?? []).length) {
        s.pastEvents = [{ date: s.endedAt, text: s.after?.event ?? (s.status === '譲渡' ? '事業譲渡' : '統合')}];
      }
      if (['譲渡', '統合', '不明', '準備中'].includes(s.status)) { s.status = '提供中'; delete s.endedAt; }
      if (st.startsWith('限定提供中')) s.stage = '限定提供中'; else delete s.stage;
      delete s.saleEnded;
    }
  } else if (st === '販売終了・保守継続') {
    s.status = '終了'; s.saleEnded = { ...(s.saleEnded ?? {}), maintenance: '継続' }; delete s.stage;
  } else if (st === '販売終了（保守の状況は未確認）') {
    s.status = '終了'; s.saleEnded = { ...(s.saleEnded ?? {}), maintenance: '未確認' }; delete s.stage;
  } else if (st === '提供終了') {
    if (!['終了', '譲渡', '統合', '休止'].includes(s.status)) s.status = '終了';
    delete s.stage;
    if (s.saleEnded) s.saleEnded.maintenance = '終了';
  }
  if (s.status !== '準備中' && s.status !== '不明' && s.stage && !/限定提供中/.test(s.stage)) delete s.stage;
  const after = JSON.stringify([s.status, s.stage ?? null, s.saleEnded ?? null, s.kind ?? null]);
  if (before !== after) changes.push(`${s.id} ${s.name.slice(0, 30)}: ${before} → ${after}（分類：${st}／${ac}）`);
}
console.log(changes.join('\n') || '変更なし');
console.log(`${changes.length}件`);
if (!dry) fs.writeFileSync(F('services.json'), JSON.stringify(S, null, 2) + '\n');
