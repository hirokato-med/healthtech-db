#!/usr/bin/env node
/**
 * 事業会社・CVC が自分で発表している出資（IR・ニュースリリース・投資先一覧）を、
 * 資金調達の記録（data/fundings.json）と資本提携・M&A の記録（data/partnerships.json）に入れる。
 *
 *   node scripts/apply-ir-investments.mjs out-1.json out-2.json ... [--dry]
 *
 * 入力: { investments: [{ investor, investorCompanyId, via, target, targetCompanyId, targetCorporateNumber, targetHp,
 *          targetDescription, targetBusiness, date, kind, round, amount(円), investorAmount(円), otherInvestors, source, note }],
 *        acquisitions: [{ acquirer, acquirerCompanyId, target, targetCompanyId, date, how, voting, source, note }] }
 * - 出資先が DB に無い会社（法人番号つき）は、先に data/ir-new-companies.json に書き出す（merge-companies.mjs と apply-biz.mjs で足す）。
 * - 同じ出資先で、前後2か月以内に同じ回（金額が同じ、または出典が同じ、または回の名前が同じ）があれば、その回の引受先に足す。無ければ回を足す。
 * - 資本提携・M&A の記録には、同じ組み合わせ・同じ種類・前後2か月以内のものが無いときだけ足す。
 * - 買収（子会社化）は、買われた会社が DB で「未上場」なら exit を「バイアウト」、親会社を買った会社にする。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (f) => path.join(ROOT, 'data', f);
const read = (f) => JSON.parse(fs.readFileSync(P(f), 'utf8'));
const dry = process.argv.includes('--dry');
const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));

const companies = read('companies.json');
const fundings = read('fundings.json');
const partnerships = read('partnerships.json');
// 事業の種類 → カテゴリ（新しい会社のカテゴリに使う）
const typeCat = new Map(read('taxonomy.json').flatMap((c) => c.types.map((t) => [t.slug, c.category])));

const LEGAL = /株式会社|合同会社|有限会社|一般社団法人|一般財団法人|公益財団法人|医療法人社団|医療法人|ホールディングス|\(株\)|（株）|㈱/g;
const key = (s = '') => s.normalize('NFKC').replace(LEGAL, '').replace(/[（(][^）)]*[）)]/g, '').replace(/[\s・･.,、'’"-]/g, '').toLowerCase();
const byId = new Map(companies.map((c) => [c.id, c]));
const byKey = new Map();
for (const c of companies) for (const n of [c.name, ...(c.aliases ?? []), ...(c.formerNames ?? [])]) if (n && !byKey.has(key(n))) byKey.set(key(n), c);
const findCo = (id, name) => (id && byId.get(id)) || (name && byKey.get(key(name))) || null;
const ym = (s) => (typeof s === 'string' && /^\d{4}-\d{2}/.test(s) ? s.slice(0, 7) : typeof s === 'string' && /^\d{4}$/.test(s) ? s : null);
const months = (a, b) => { const [ya, ma = '06'] = a.split('-'); const [yb, mb = '06'] = b.split('-'); return Math.abs((Number(ya) * 12 + Number(ma)) - (Number(yb) * 12 + Number(mb))); };
const toMillion = (v) => (typeof v === 'number' && v > 0 ? Math.round(v / 1e4) / 100 : null); // 円 → 百万円
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const strip = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && !v.length)));

// 出資先の主なカテゴリから、提携マップの領域を決める
const AREA = { 'mental-health': '精神・神経', femtech: '女性の健康', nursing: '介護・高齢者', 'home-visit-nursing': '介護・高齢者', sleep: '睡眠', 'clinical-trial-support': '治験・研究', cro: '治験・研究', 'real-world-data': '医療DX・データ', 'medical-data-analytics': '医療DX・データ', 'disease-management-program': '生活習慣・予防', 'health-corporate-management': '生活習慣・予防', fitness: '生活習慣・予防', 'health-consulting': '生活習慣・予防' };
const areaOf = (c) => AREA[(c?.categories ?? [])[0]] ?? '医療DX・データ';

const newCompanies = [];
const PF = P('investor-portfolio.json');
const portfolio = fs.existsSync(PF) ? JSON.parse(fs.readFileSync(PF, 'utf8')).items : [];
let undated = 0;
const newBusinesses = [];
let addedRounds = 0, joined = 0, already = 0, deals = 0, acq = 0, exits = 0, skipped = 0;
const skippedRows = [];

for (const f of files) {
  const o = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const x of o.investments ?? []) {
    const date = ym(x.date);
    // 投資家の名前は、DB での呼び名（investorKey）→ CVC・ファンドの名義（via）→ 出資した会社の順
    const investor = str(x.investorKey) ?? str(x.via) ?? str(x.investor);
    if (investor && !date && str(x.source) && str(x.target)) {
      // 投資先一覧に載っているが、出資の時期が分からないもの（あとで投資家ページに「時期不明の投資先」として出せるよう残す）
      const t0 = findCo(x.targetCompanyId, x.target);
      if (!portfolio.some((p) => key(p.investor) === key(investor) && key(p.target) === key(x.target))) portfolio.push(strip({ investor, target: t0?.name ?? x.target.trim(), targetCompanyId: t0?.id, source: x.source.trim(), note: str(x.note) }));
      undated++;
      continue;
    }
    if (!date || !investor || !str(x.source) || !str(x.target)) { skipped++; skippedRows.push(`形が足りない: ${x.investor} → ${x.target}`); continue; }
    let t = findCo(x.targetCompanyId, x.target);
    if (!t) {
      // DB に無い出資先：法人番号があれば、新しい会社として書き出す（このあと merge-companies.mjs で足す）
      if (/^\d{13}$/.test(x.targetCorporateNumber ?? '') && !newCompanies.some((c) => c.corporateNumber === x.targetCorporateNumber)) {
        const cat = typeCat.get(x.targetBusiness?.type ?? '');
        newCompanies.push(strip({ name: x.target, hp: str(x.targetHp) ?? '', corporateNumber: x.targetCorporateNumber, description: str(x.targetDescription), categories: cat ? [cat] : undefined, exit: '未上場', sources: [x.source, x.targetBusiness?.sources?.[0]].filter(Boolean), note: '事業会社・CVC の出資の発表から' }));
        if (x.targetBusiness?.name) newBusinesses.push(strip({ ...x.targetBusiness, company: x.target, corporateNumber: x.targetCorporateNumber, companyHp: str(x.targetHp), status: x.targetBusiness.status ?? '提供中' }));
      }
      skipped++; skippedRows.push(`出資先が DB に無い（新しい会社として書き出し）: ${x.target}`);
      continue;
    }
    const fu = (fundings[t.id] ??= { rounds: [] });
    fu.rounds ??= [];
    const amount = toMillion(x.amount);
    const others = (x.otherInvestors ?? []).filter((n) => typeof n === 'string' && n.trim());
    const same = fu.rounds.find((r) => r.date && months(r.date, date) <= 2 && ((amount && r.amount && Math.abs(r.amount - amount) < 0.5) || (r.source && r.source === x.source) || (str(x.round) && r.round === x.round) || (r.investors ?? []).some((n) => key(n) === key(investor))));
    if (same) {
      if ((same.investors ?? []).some((n) => key(n) === key(investor) || key(n) === key(x.investor))) already++;
      else { same.investors = [...(same.investors ?? []), investor]; joined++; }
      if (!same.amount && amount) same.amount = amount;
      if (!same.round && str(x.round)) same.round = x.round.trim();
    } else {
      fu.rounds.push(strip({
        date, round: str(x.round), type: x.kind === '資本業務提携' ? '資本業務提携' : '第三者割当増資', amount,
        investors: [investor, ...others.filter((n) => key(n) !== key(investor))], source: x.source.trim(),
        note: [x.investorAmount ? `${x.investor.replace(LEGAL, '')}の出資額 ${toMillion(x.investorAmount)}百万円` : '', str(x.note) ?? ''].filter(Boolean).join('。') || '出資した側の発表',
      }));
      fu.rounds.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
      addedRounds++;
    }
    // 資本提携・M&A の記録（企業ページの「資本提携・M&A」と提携マップ）
    const from = findCo(x.investorCompanyId, x.investor)?.name ?? x.investor.trim();
    const kind = x.kind === '資本業務提携' ? '資本業務提携' : '出資';
    const dup = partnerships.find((p) => p.type === 'investment' && key(p.from) === key(from) && key(p.to) === key(t.name) && (!p.date || months(p.date, date) <= 2));
    if (!dup) {
      partnerships.push(strip({ from, to: t.name, type: 'investment', kind, label: kind, area: areaOf(t), date, status: '不明', note: str(x.note), sources: [x.source.trim()] }));
      deals++;
    }
  }
  for (const a of o.acquisitions ?? []) {
    const date = ym(a.date);
    if (!date || !str(a.acquirer) || !str(a.target) || !str(a.source)) continue;
    const buyer = findCo(a.acquirerCompanyId, a.acquirer);
    const t = findCo(a.targetCompanyId, a.target);
    const from = buyer?.name ?? a.acquirer.trim();
    const to = t?.name ?? a.target.trim();
    const dup = partnerships.find((p) => p.type === 'parent' && key(p.from) === key(from) && key(p.to) === key(to) && (!p.date || months(p.date, date) <= 3));
    if (!dup) {
      partnerships.push(strip({ from, to, type: 'parent', kind: '買収・子会社化', label: /吸収合併/.test(a.how ?? '') ? '吸収合併' : '買収・子会社化', area: areaOf(t), date, status: '継続', note: [str(a.note), typeof a.voting === 'number' ? `議決権 ${a.voting}%` : ''].filter(Boolean).join('。') || undefined, sources: [a.source.trim()] }));
      acq++;
    }
    if (t && /子会社化/.test(a.how ?? '') && (!t.exit || t.exit === '未上場')) {
      t.exit = 'バイアウト';
      if (!t.parentCompany) t.parentCompany = from;
      t.history = [...(t.history ?? []), { date, text: `${from.replace(LEGAL, '')}が${a.how}`, source: a.source.trim() }].sort((p, q) => p.date.localeCompare(q.date));
      exits++;
    }
  }
}

if (!dry) {
  fs.writeFileSync(P('fundings.json'), JSON.stringify(fundings, null, 2) + '\n');
  fs.writeFileSync(P('partnerships.json'), JSON.stringify(partnerships, null, 2) + '\n');
  fs.writeFileSync(P('companies.json'), JSON.stringify(companies, null, 2) + '\n');
  fs.writeFileSync(PF, JSON.stringify({ note: '投資家の投資先一覧（ポートフォリオ）に載っているが、出資の時期が分からないもの', items: portfolio }, null, 1) + '\n');
}
if (!dry) fs.writeFileSync(P('ir-new-companies.json'), JSON.stringify({ companies: newCompanies, businesses: newBusinesses }, null, 1) + '\n');
console.error(`回を足した ${addedRounds} / 既存の回に引受先を足した ${joined} / もう入っていた ${already} / 資本提携の記録 ${deals} / 買収の記録 ${acq}（未上場→バイアウト ${exits}社）/ 時期の分からない投資先 ${undated} / 飛ばした ${skipped}`);
console.error(`DB に無い出資先 ${newCompanies.length} 社（事業 ${newBusinesses.length} 件）を data/ir-new-companies.json に書き出し`);
if (process.argv.includes('--verbose')) skippedRows.forEach((s) => console.error('  - ' + s));
