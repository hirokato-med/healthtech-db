#!/usr/bin/env node
/**
 * 資金調達の履歴（ラウンドごと）を data/fundings.json に取り込む。
 *
 *   node scripts/merge-fundings.mjs out-1.json out-2.json ...
 *
 * 入力（JSON 配列）: { id, rounds: [{ date, round, type, amount(百万円), investors, lead, source, note }], totalFunding: { amount, asOf, note, source }, note }
 * - 同じ会社は入力で置き換える（調べ直した結果を優先）。rounds が空でも「調べた」記録として残す。
 * - まとめサイト（INITIAL・STARTUP DB 等）だけが出典のラウンドは、金額を消して「当事者の発表は未確認」とする。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const F = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'fundings.json');
const fundings = fs.existsSync(F) ? JSON.parse(fs.readFileSync(F, 'utf8')) : {};
const ids = new Set(JSON.parse(fs.readFileSync(path.join(path.dirname(F), 'companies.json'), 'utf8')).map((c) => c.id));
const AGG = /initial\.inc|startup-db\.com|kepple\.co\.jp|for-startups\.jp|crunchbase\.com/;
const TYPES = ['第三者割当増資', '融資（デット）', 'J-KISS・転換社債', '資本業務提携', 'その他'];
const today = new Date().toISOString().slice(0, 7);
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);
const strip = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && !(Array.isArray(v) && !v.length)));

let companies = 0, rounds = 0, aggregator = 0, unknown = 0;
for (const f of process.argv.slice(2)) {
  for (const x of JSON.parse(fs.readFileSync(f, 'utf8'))) {
    if (!ids.has(x.id)) { unknown++; continue; }
    const rs = (x.rounds ?? [])
      .filter((r) => /^\d{4}(-\d{2})?/.test(r.date ?? '') && str(r.source))
      .map((r) => {
        const agg = AGG.test(r.source);
        if (agg) aggregator++;
        return strip({
          date: r.date.slice(0, 7),
          round: str(r.round) && r.round !== '不明' ? r.round.trim() : undefined,
          type: TYPES.includes(r.type) ? r.type : 'その他',
          amount: agg ? null : num(r.amount),
          investors: (r.investors ?? []).map(str).filter(Boolean),
          lead: str(r.lead),
          source: r.source.trim(),
          note: [str(r.note), agg ? '当事者の発表は未確認' : undefined].filter(Boolean).join('。') || undefined,
        });
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    const t = x.totalFunding;
    const total = t && num(t.amount) && str(t.source) && !AGG.test(t.source) ? strip({ amount: t.amount, asOf: str(t.asOf), note: str(t.note), source: t.source }) : undefined;
    fundings[x.id] = strip({ rounds: rs, total, note: str(x.note), checkedAt: today });
    if (!fundings[x.id].rounds) fundings[x.id].rounds = [];
    companies++;
    rounds += rs.length;
  }
}
const sorted = Object.fromEntries(Object.entries(fundings).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(F, JSON.stringify(sorted, null, 1) + '\n');
console.error(`資金調達 ${companies} 社・${rounds} ラウンドを取り込み（まとめサイトのみの出典 ${aggregator} 件は金額なし、DBにない会社 ${unknown}）→ 計 ${Object.keys(sorted).length} 社`);
