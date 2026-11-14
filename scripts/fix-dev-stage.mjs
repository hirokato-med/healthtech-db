#!/usr/bin/env node
/**
 * 「提供中」なのに、説明では開発中・治験中の製品（医薬品・医療機器・治療用アプリなど）を「準備中」と段階（stage）に直す。
 * 「事業活動が続いている」と「製品を通常利用できる」を分けるため。医療機器の承認・認証の記録（device）があるものは変えない。
 * CRO・治験支援・研究受託などのサービス（治験という言葉が出ても、提供しているもの）は除く。
 *   node scripts/fix-dev-stage.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const F = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'data', 'services.json');
const list = JSON.parse(fs.readFileSync(F, 'utf8'));
const dry = process.argv.includes('--dry');
const DEV = /開発中|研究開発段階|研究段階|治験段階|治験中|治験(を|の)?準備|検証的(試験|治験)|第[1-3ⅠⅡⅢI]+[/／a-zA-Z0-9ⅠⅡⅢ]*相|承認申請中|(薬|医薬品?|製品|製剤|療法|ワクチン|医療機器)の?候補|前臨床|非臨床開発|臨床開発中|プロトタイプ|試作|承認前|治験計画届/;
const SERVICE = /CRO|SMO|CDMO|支援|受託|代行|業務|被験者|募集|管理|治験情報|プラットフォーム|コンサル|ソリューション|システム$|サービス$|EDC|派遣|検索|ライセンス|基盤|アッセイ|共同研究|試薬|分析|データ|CRM|AIアシスタント|チェッカー|コーディング|医療連携/;
const stageOf = (t) => /承認申請中/.test(t) ? '承認申請中'
  : /治験(を|の)?準備|治験計画届|IND申請/.test(t) && !/治験中|相試験を(実施|行)|治験を実施中/.test(t) ? '治験準備中'
  : /治験中|治験段階|検証的(試験|治験)|第[1-3ⅠⅡⅢI]+[/／a-zA-Z0-9ⅠⅡⅢ]*相|医師主導治験|臨床開発/.test(t) ? '治験中'
  : '研究開発中';
let n = 0;
const by = {};
for (const s of list) {
  if (s.status !== '提供中' || s.device || s.stageLocked) continue;
  const t = `${s.name} ${s.description ?? ''}`;
  if (!DEV.test(t) || SERVICE.test(s.name)) continue;
  const stage = stageOf(t);
  if (dry) console.error(`${s.id} ${stage}｜${s.name.slice(0, 40)}（${s.company.slice(0, 16)}）`);
  s.status = '準備中';
  s.stage = stage;
  s.stageNote = '説明の開発段階から（製品として一般に使える状態ではない）';
  by[stage] = (by[stage] ?? 0) + 1;
  n++;
}
if (!dry) fs.writeFileSync(F, JSON.stringify(list, null, 2) + '\n');
console.error(`「提供中」→「準備中」${n}件`, by);
