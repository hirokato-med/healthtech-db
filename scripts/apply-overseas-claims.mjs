#!/usr/bin/env node
/**
 * 海外企業の記載ごとの出典（ov2/out-N.json）を data/overseas.json に当てる。
 *   node scripts/apply-overseas-claims.mjs out-1.json ...
 * 記載を4つの塊に分けて、それぞれに裏づけの出典（url・資料の発表日・種類）を持つ：
 *   founding（創業者・創業年）／capital（上場・買収・閉鎖）／activity（いまの提供状況、確かめた日）／figures（数字）
 * 出来事（events）は、出来事の日（date）・種類（type：買収合意の発表／買収完了 など）・その出来事を書いた資料（source）を分けて持つ。
 * 裏づけの無い記載（verified: false）は、画面に出さない。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const F = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'data', 'overseas.json');
const list = JSON.parse(fs.readFileSync(F, 'utf8'));
const byId = new Map(list.map((o) => [o.id, o]));
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const ym = (v) => (typeof v === 'string' && /^\d{4}(-\d{2}){0,2}$/.test(v.trim()) ? v.trim() : undefined);
const KINDS = new Set(['official', 'sec', 'regulator', 'exchange', 'news', 'wikipedia', 'database']);
const src = (s) => (s && str(s.url) ? { url: s.url.trim(), ...(ym(s.published) ? { published: s.published.trim() } : {}), kind: KINDS.has(s.kind) ? s.kind : 'news' } : undefined);
const srcs = (a) => (Array.isArray(a) ? a.map(src).filter(Boolean) : []);
const LISTING = new Set(['未上場', '上場', '上場廃止', '買収', '閉鎖']);

let n = 0, unverified = 0;
for (const f of process.argv.slice(2)) for (const x of JSON.parse(fs.readFileSync(f, 'utf8'))) {
  const o = byId.get(x.id);
  if (!o || o.hidden) continue;
  const claims = {};
  if (x.founding) {
    claims.founding = { verified: x.founding.verified !== false, sources: srcs(x.founding.sources) };
    if (claims.founding.verified) {
      if (Number.isInteger(x.founding.foundedYear)) o.foundedYear = x.founding.foundedYear;
      if (Array.isArray(x.founding.founders)) o.founders = x.founding.founders.filter(str).map((s) => s.trim());
    }
  }
  if (x.capital) {
    const c = x.capital;
    claims.capital = { verified: c.verified !== false, sources: srcs(c.sources) };
    if (claims.capital.verified && LISTING.has(c.listing)) {
      o.listing = c.listing;
      for (const k of ['listedAt', 'acquiredAt', 'closedAt', 'delistedAt']) { const v = ym(c[k]); if (v) o[k] = v.slice(0, 7); else delete o[k]; }
      for (const k of ['market', 'ticker', 'acquiredBy']) { const v = str(c[k]); if (v) o[k] = v; else delete o[k]; }
      if (o.listing !== '買収') { delete o.acquiredBy; delete o.acquiredAt; }
    }
  }
  if (x.activity) {
    claims.activity = { verified: x.activity.verified !== false, checkedAt: ym(x.activity.checkedAt) ?? '2026-11', sources: srcs(x.activity.sources) };
    if (claims.activity.verified && ['事業継続', '事業終了', '不明'].includes(x.activity.value)) o.activity = x.activity.value;
  }
  claims.figures = (x.figures ?? []).filter((g) => str(g.text)).map((g) => ({ text: g.text.trim(), verified: g.verified !== false, ...(src(g.source) ? { source: src(g.source) } : {}) }));
  if (Array.isArray(x.events)) o.events = x.events.filter((e) => ym(e.date) && str(e.text)).map((e) => ({ date: e.date.slice(0, 7), ...(str(e.type) ? { type: e.type.trim() } : {}), text: e.text.trim(), ...(src(e.source) ? { source: src(e.source) } : {}) }));
  if (str(x.description)) o.description = x.description.trim();
  for (const k of ['founding', 'capital', 'activity']) if (claims[k] && (!claims[k].verified || !claims[k].sources.length)) unverified++;
  o.claims = claims;
  // 会社全体の出典は、記載ごとの出典を重複なく並べたもの
  o.sources = [...new Set([...['founding', 'capital', 'activity'].flatMap((k) => claims[k]?.sources ?? []), ...(o.events ?? []).map((e) => e.source).filter(Boolean), ...claims.figures.map((g) => g.source).filter(Boolean)].map((s) => s.url))];
  o.checkedAt = '2026-11';
  n++;
}
fs.writeFileSync(F, JSON.stringify(list, null, 2) + '\n');
console.error(`記載ごとの出典を入れた ${n} 社／裏づけの無い記載の塊 ${unverified} 件`);
