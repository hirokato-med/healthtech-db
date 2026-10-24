/**
 * データの更新履歴（data/updates.json）に1件足す。トップの「データの更新」と /updates/ に出る。
 *
 * entry: { date: 'YYYY-MM-DD', kind: '決算' など, title, body?, href?, links?: [{ label, href }], key? }
 * - key があり、同じ日付・同じ key の項目がすでにあれば、links を足し合わせて1件にまとめる（自動更新で毎回増やさない）。
 *   このとき title は makeTitle(links) があればそれで作り直す。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const F = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'updates.json');

/** 日本時間の今日（YYYY-MM-DD） */
export const todayJst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

export function addUpdate(entry, makeTitle) {
  const list = fs.existsSync(F) ? JSON.parse(fs.readFileSync(F, 'utf8')) : [];
  const same = entry.key ? list.find((u) => u.key === entry.key && u.date === entry.date) : undefined;
  if (same) {
    const seen = new Set((same.links ?? []).map((l) => l.href + l.label));
    for (const l of entry.links ?? []) if (!seen.has(l.href + l.label)) same.links = [...(same.links ?? []), l];
    same.title = makeTitle ? makeTitle(same.links ?? []) : entry.title;
    if (entry.body) same.body = entry.body;
  } else {
    list.unshift({ ...entry, title: makeTitle ? makeTitle(entry.links ?? []) : entry.title });
  }
  // 新しい日付が上。同じ日付は足した順（新しいものが上）を保つ
  list.sort((a, b) => b.date.localeCompare(a.date));
  fs.writeFileSync(F, JSON.stringify(list, null, 1) + '\n');
}
