#!/usr/bin/env node
/**
 * データの矛盾・取りこぼしを点検する（直さずに知らせるだけ）。
 *
 *   node scripts/check-data.mjs          # 項目ごとの件数と例
 *   node scripts/check-data.mjs --all    # 例をすべて出す
 *   node scripts/check-data.mjs --strict # 「直すべき」が1件でもあれば終了コード1
 *
 * 「直すべき」は公開して困るもの（作業メモが残っている、状態と日付が食い違う、存在しない会社を指している など）。
 * 「確かめたい」は埋めたい空欄や重複の候補。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
const services = read('services.json');
const companies = read('companies.json');
const taxonomy = read('taxonomy.json');
const all = process.argv.includes('--all');
const strict = process.argv.includes('--strict');

const companyIds = new Set(companies.map((c) => c.id));
const typeCat = new Map(taxonomy.flatMap((c) => c.types.map((t) => [t.slug, c.category])));
const adjacent = new Set(taxonomy.flatMap((c) => c.types.filter((t) => t.scope === 'adjacent').map((t) => t.slug)));
const STOPPED = new Set(['終了', '譲渡', '統合', '休止']);
const today = new Date().toISOString().slice(0, 10);
// サイトに出る文に残ってはいけない作業メモ
const MEMO = /開始時期は|開始年は|特定できず|確認できず|未確認|要確認|表示形式|沿革上|一覧上|取得テキスト|TODO|grep/;
const label = (s) => `${s.id} ${s.name}（${s.company}）`;

const must = [], want = [];
const add = (list, name, items, fmt = label) => list.push({ name, items: items.map(fmt) });

// 直すべき
add(must, '説明文に作業メモが残っている', services.filter((s) => MEMO.test(s.description ?? '')));
add(must, '「提供中」なのに終了日がある', services.filter((s) => s.status === '提供中' && s.endedAt));
add(must, '止まった事業なのに止まった理由が空', services.filter((s) => STOPPED.has(s.status) && !s.endReasons?.length));
add(must, '開始が終了より後', services.filter((s) => s.startedAt && s.endedAt && s.startedAt.slice(0, 7) > s.endedAt.slice(0, 7)));
add(must, '「提供中」なのに開始が未来の日付', services.filter((s) => s.status === '提供中' && s.startedAt && s.startedAt > today));
add(must, 'DB にない会社を指している', services.filter((s) => s.companyId && !companyIds.has(s.companyId)));
add(must, '事業の種類が空か、無い種類', services.filter((s) => !typeCat.has(s.type)));
add(must, 'カテゴリが事業の種類と合わない', services.filter((s) => typeCat.has(s.type) && typeCat.get(s.type) !== s.category));
add(must, '出典が無い', services.filter((s) => !s.sources?.length));
add(must, '説明文・教訓が文字列でない（まとめ処理で壊れた など）', services.filter((s) => ['description', 'lessons', 'endReasonNote'].some((k) => s[k] != null && typeof s[k] !== 'string')));
add(must, '節目の日付の形がおかしい', services.filter((s) => (s.milestones ?? []).some((m) => m.date && !/^\d{4}(-\d{2}){0,2}$/.test(m.date))));

// 確かめたい（デジタルヘルスの中心を先に並べる）
const digitalFirst = (a, b) => Number(adjacent.has(a.type)) - Number(adjacent.has(b.type));
add(want, '説明文が短い（25字未満）', services.filter((s) => (s.description ?? '').length < 25).sort(digitalFirst));
add(want, '開始時期も提供を確認できた時点も空', services.filter((s) => !s.startedAt && !s.knownSince).sort(digitalFirst));
add(want, '止まった事業で終了日が空', services.filter((s) => STOPPED.has(s.status) && !s.endedAt).sort(digitalFirst));
add(want, '止まった理由が unknown', services.filter((s) => STOPPED.has(s.status) && s.endReasons?.includes('unknown')).sort(digitalFirst));
add(want, '状態が「不明」', services.filter((s) => s.status === '不明').sort(digitalFirst));
add(want, '出典が1つだけ', services.filter((s) => s.sources?.length === 1).sort(digitalFirst));
// 同じ会社の中で、「」の中身か括弧より前の名前が同じもの
const norm = (s = '') => s.normalize('NFKC').replace(/株式会社|合同会社|[\s「」『』（）()・]/g, '').toLowerCase();
const core = (n) => norm((n.match(/「([^」]+)」/) ?? [])[1] ?? n.replace(/[（(].*$/, ''));
const seen = new Map(), dup = [];
for (const s of services) {
  const k = `${s.companyId ?? norm(s.company)}|${core(s.name)}`;
  if (seen.has(k)) dup.push(`${seen.get(k).id} ⇔ ${label(s)}`); else seen.set(k, s);
}
want.push({ name: '同じ会社で名前が重なる（重複の候補）', items: dup });
const live = companies.filter((c) => !['閉鎖', '合併', '活動停止'].includes(c.exit));
const svcCount = new Map();
for (const s of services) if (s.companyId) svcCount.set(s.companyId, (svcCount.get(s.companyId) ?? 0) + 1);
add(want, '事業が1件も無い存続会社', live.filter((c) => !svcCount.get(c.id)), (c) => `${c.id} ${c.name}`);
add(want, '法人番号があるのに仮の id（jp-）の会社', companies.filter((c) => c.id.startsWith('jp-') && /^\d{13}$/.test(c.corporateNumber ?? '')), (c) => `${c.id} ${c.name}`);

const show = (title, list) => {
  console.log(`\n■ ${title}`);
  for (const { name, items } of list) {
    console.log(`  ${items.length ? '●' : '○'} ${name}：${items.length} 件`);
    for (const i of all ? items : items.slice(0, 3)) console.log(`      ${i}`);
  }
};
const dig = services.filter((s) => !adjacent.has(s.type));
console.log(`事業 ${services.length} 件（デジタルヘルスの中心 ${dig.length}・周辺 ${services.length - dig.length}）／企業 ${companies.length} 社`);
show('直すべき', must);
show('確かめたい', want);
if (strict && must.some((m) => m.items.length)) process.exit(1);
