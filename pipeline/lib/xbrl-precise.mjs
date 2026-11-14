/**
 * 決算短信の XBRL から、比率の計算に使う細かい数字を取り出す。
 * - parseChanges：サマリーにある会社開示の前年同期比（%）。比率はこれを優先する
 * - parsePL：添付の損益計算書（千円・円単位）の当期・前年同期の数字。百万円に直すが丸めない
 * 画面では money() で丸めて出す（丸めは最後に1回だけ）。
 */
const text = (s) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
const ITEM = [
  ['revenue', /^(NetSales|OperatingRevenues|OrdinaryRevenues|Revenue|Revenues|NetSalesIFRS|RevenueIFRS|SalesIFRS|OperatingRevenuesIFRS|NetSalesUS|RevenuesUS|OperatingRevenuesUS|BusinessRevenue|OperatingRevenue|OperatingRevenue1|NetSalesAndOperatingRevenue|NetSalesOfCompletedConstructionContracts)$/],
  ['operatingIncome', /^(OperatingIncome|OperatingIncomeIFRS|OperatingProfitIFRS|OperatingProfitLoss|OperatingIncomeLoss|OperatingIncomeUS)$/],
  ['ordinaryIncome', /^(OrdinaryIncome|OrdinaryIncomeLoss|ProfitBeforeTaxIFRS|ProfitLossBeforeTax|IncomeBeforeIncomeTaxesUS)$/],
  ['netIncome', /^(ProfitAttributableToOwnersOfParent|ProfitAttributableToOwnersOfParentIFRS|ProfitLossAttributableToOwnersOfParent|NetIncome|NetIncomeAttributableToOwnersOfParentUS)$/],
];
const facts = (html) => {
  html = html.replace(/<ix:nonFraction[^>]*\/>/g, '');
  const out = [];
  for (const m of html.matchAll(/<ix:nonFraction([^>]*)>([\s\S]*?)<\/ix:nonFraction>/g)) {
    const a = m[1];
    const name = (a.match(/name="[^:"]+:([^"]+)"/) ?? [])[1];
    const ctx = (a.match(/contextRef="([^"]+)"/) ?? [])[1];
    const raw = text(m[2]).replace(/,/g, '');
    if (!name || !ctx || raw === '' || isNaN(Number(raw))) continue;
    const scale = Number((a.match(/scale="(-?\d+)"/) ?? [])[1] ?? 0);
    out.push({ name, ctx, v: Number(raw) * 10 ** scale * (/sign="-"/.test(a) ? -1 : 1) });
  }
  return out;
};

/** サマリーの前年同期比（ChangeInNetSales など）。{ revenue: 396.9, ... }（%） */
export function parseChanges(html) {
  const by = { con: {}, non: {} };
  for (const f of facts(html)) {
    const m = f.name.match(/^ChangeIn(.+)$/);
    if (!m || !/^Current(Year|Accumulated\w+)Duration/.test(f.ctx) || !f.ctx.includes('ResultMember')) continue;
    const item = ITEM.find(([, re]) => re.test(m[1]))?.[0];
    if (!item) continue;
    by[f.ctx.includes('NonConsolidatedMember') ? 'non' : 'con'][item] = Math.round(f.v * 1000) / 10;
  }
  const o = Object.keys(by.con).length ? by.con : by.non;
  return Object.keys(o).length ? o : undefined;
}

/** 添付の損益計算書の当期・前年同期（百万円、丸めない）。{ current, prior } */
export function parsePL(html) {
  const by = { con: { current: {}, prior: {} }, non: { current: {}, prior: {} } };
  for (const f of facts(html)) {
    const when = /^(Current(YTD|Year)|Interim)Duration/.test(f.ctx) ? 'current' : /^Prior1(YTD|Year|Interim)Duration/.test(f.ctx) ? 'prior' : null;
    if (!when) continue;
    // 連結・単体以外の区分（セグメントなど）が付いたものは使わない
    const dims = f.ctx.split('_').slice(1).filter((d) => !/^(Consolidated|NonConsolidated)Member$/.test(d));
    if (dims.length) continue;
    const scope = f.ctx.includes('NonConsolidatedMember') ? 'non' : 'con';
    // 単体決算の当期純利益は ProfitLoss で出ることが多い（連結では非支配株主の分を含むので使わない）
    if (scope === 'non' && /^(ProfitLoss|NetIncomeLoss)$/.test(f.name)) { (by.non[when].__net ??= f.v / 1e6); continue; }
    const item = ITEM.find(([, re]) => re.test(f.name))?.[0];
    if (!item) continue;
    by[scope][when][item] ??= f.v / 1e6;
  }
  for (const w of ['current', 'prior']) { const x = by.non[w]; if (x.__net != null) { x.netIncome ??= x.__net; delete x.__net; } }
  const o = Object.keys(by.con.current).length ? by.con : by.non;
  return Object.keys(o.current).length ? o : undefined;
}

/** 決算短信の zip の中で、損益計算書（pl）の添付ファイルを選ぶ */
export const plFileOf = (list) => list.find((n) => /XBRLData\/Attachment\/.*-(?:qn|ac|sm)?[a-z]*pl\d*-.*-ixbrl\.htm$/.test(n) && !/ci\d*-/.test(n))
  ?? list.find((n) => /XBRLData\/Attachment\/\d+-[a-z]*pl\d*-.*-ixbrl\.htm$/.test(n));

/**
 * 決算短信 PDF の1ページ目の業績の表から、会社開示の前年同期比（%）を読む（XBRL が残っていない古い決算のため）。
 * 表の列の並びは会社ごとに違う（EBITDA などが入る）ので、見出しではなく「金額」で合わせる：
 * 当期の行の「金額 増減率」の組のうち、金額が DB の当期の値（百万円）と同じ組の増減率を、その項目の開示値とする。
 * text は pdftotext -layout の1ページ目。current は { revenue, operatingIncome, ... }（百万円）。
 */
export function changesFromPdfText(text, current) {
  const lines = text.normalize('NFKC').split('\n');
  const head = lines.findIndex((l) => /経営成績|業績/.test(l) && /累計|％表示|%表示/.test(l + (lines[lines.indexOf(l) + 1] ?? '')));
  if (head < 0) return undefined;
  // 見出しのあと、最初に「金額 増減率」が並ぶ行（期の名前と同じ行か、次の行）
  const row = lines.slice(head + 1, head + 14).find((l) => /\d[\d,]*\s+△?\d+\.\d/.test(l) && !/百万円/.test(l));
  if (!row) return undefined;
  const tok = row.replace(/^\s*\d{4}年\s*\d{1,2}月期\S*/, '').trim().split(/\s+/);
  const pairs = [];
  for (let i = 0; i < tok.length; i++) {
    const v = tok[i].match(/^(△)?([\d,]+)$/);
    if (!v) continue;
    const p = tok[i + 1]?.match(/^(△)?(\d+\.\d)$/);
    if (p) { pairs.push({ value: Number(v[2].replace(/,/g, '')) * (v[1] ? -1 : 1), pct: Number(p[2]) * (p[1] ? -1 : 1) }); i++; }
  }
  const out = {};
  const used = new Set();
  for (const k of ['revenue', 'operatingIncome', 'ordinaryIncome', 'netIncome']) {
    const c = current?.[k];
    if (c == null || c <= 0) continue;
    const j = pairs.findIndex((p, idx) => !used.has(idx) && Math.abs(p.value - c) <= 1);
    if (j >= 0) { out[k] = pairs[j].pct; used.add(j); }
  }
  return Object.keys(out).length ? out : undefined;
}
