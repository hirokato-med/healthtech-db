#!/usr/bin/env node
/**
 * 有価証券報告書から集めた上場企業のグループ会社（子会社・関連会社・以前の子会社）を data/companies.json の group に入れる。
 *
 *   node scripts/apply-groups.mjs out-1.json out-2.json ...
 *
 * 入力（配列）: [{ id, group: { asOf, sourceLabel, source, consolidated, equityMethod, scope, note, members: [...], former: [...] } | null }]
 * - 同じ会社は入力で置き換える。group が null（子会社が無い）のときは group を消す。
 * - 親会社・その他の関係会社を先頭に、次に連結子会社、持分法適用会社、非連結子会社の順に並べる。
 * - 議決権の割合は 0〜100 の数値だけ残す。日付は YYYY-MM に切りそろえる。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const F = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'companies.json');
const companies = JSON.parse(fs.readFileSync(F, 'utf8'));
const byId = new Map(companies.map((c) => [c.id, c]));
const ORDER = ['親会社', 'その他の関係会社', '連結子会社', '持分法適用関連会社', '持分法適用非連結子会社', '非連結子会社'];
const rank = (r = '') => { const i = ORDER.findIndex((o) => r.startsWith(o)); return i < 0 ? ORDER.length : i; };
const ym = (s) => (typeof s === 'string' && /^\d{4}(-\d{2})?/.test(s) ? s.slice(0, 7) : undefined);
const pct = (v) => (typeof v === 'number' && v >= 0 && v <= 100 ? Math.round(v * 100) / 100 : undefined);
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const strip = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== false && !(Array.isArray(v) && !v.length)));
// 企業ページに出す注記は、表を省いた・ヘルスケアだけにした等の説明だけにする（作業メモは出さない）
const publicNote = (n) => (str(n) && /省/.test(n) ? n.trim() : undefined);

let set = 0, cleared = 0, unknown = 0;
for (const f of process.argv.slice(2)) {
  for (const x of JSON.parse(fs.readFileSync(f, 'utf8'))) {
    const c = byId.get(x.id);
    if (!c) { unknown++; continue; }
    const g = x.group;
    if (!g || !(g.members?.length || g.former?.length)) { if (c.group) { delete c.group; cleared++; } continue; }
    const members = (g.members ?? []).filter((m) => str(m.name)).map((m) => strip({
      name: m.name.trim(), companyId: str(m.companyId) && byId.has(m.companyId) ? m.companyId : undefined, formerName: str(m.formerName),
      relation: str(m.relation) ?? '連結子会社', address: str(m.address),
      capital: typeof m.capital === 'number' && m.capital >= 0 ? m.capital : undefined, capitalText: str(m.capitalText),
      business: str(m.business), voting: pct(m.voting), indirect: pct(m.indirect) || undefined, owned: m.owned === true || undefined,
      whollyOwnedAtAcquisition: m.whollyOwnedAtAcquisition === true || undefined,
      note: str(m.note), since: ym(m.since), source: str(m.source),
    })).sort((a, b) => rank(a.relation) - rank(b.relation));
    const former = (g.former ?? []).filter((m) => str(m.name)).map((m) => strip({
      name: m.name.trim(), companyId: str(m.companyId) && byId.has(m.companyId) ? m.companyId : undefined, formerName: str(m.formerName),
      since: ym(m.since), end: ym(m.end), how: str(m.how) ?? '—', note: str(m.note), source: str(m.source),
    })).sort((a, b) => (a.end ?? a.since ?? '').localeCompare(b.end ?? b.since ?? ''));
    c.group = strip({
      asOf: ym(g.asOf), sourceLabel: str(g.sourceLabel) ?? '有価証券報告書', source: str(g.source),
      consolidated: typeof g.consolidated === 'number' ? g.consolidated : undefined, equityMethod: typeof g.equityMethod === 'number' ? g.equityMethod : undefined,
      scope: g.scope === 'healthcare' ? 'healthcare' : undefined, note: publicNote(g.note), members, former,
    });
    c.group.members ??= []; // 子会社が今は無く、以前の子会社だけの会社もある
    set++;
  }
}
fs.writeFileSync(F, JSON.stringify(companies, null, 2) + '\n');
console.error(`グループ会社を入れた ${set} 社 / 消した ${cleared} 社 / DB に無い id ${unknown} 件`);
