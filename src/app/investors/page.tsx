import type { Metadata } from 'next';
import Link from 'next/link';
import { getInvestors } from '@/lib/data';
import { INVESTOR_TYPES, YEARS, activity } from '@/lib/investors';
import { InvestorTable, type InvestorRow } from '@/components/InvestorTable';

export const metadata: Metadata = {
  title: 'ヘルスケアに投資している投資家（VC・事業会社）',
  description: '国内ヘルスケア企業の資金調達の引受先を、VC・事業会社・金融機関系・大学系・政府系に分けて、どこに・いつ出資したかを一覧にしたもの。',
};

/** 投資家の一覧：ヘルスケアのスタートアップにどこが出資しているか。2社以上に出資した投資家を出す */
export default function InvestorsPage() {
  const list = getInvestors().filter((i) => i.companies >= 2);
  const rows: InvestorRow[] = list.map((i) => {
    const a = activity(i);
    return { id: i.id, name: i.name, type: i.type, companies: i.companies, leads: a.leads, first: a.first, last: a.last, label: a.label, tone: a.tone, years: YEARS.map((y) => a.byYear.get(y) ?? 0) };
  });
  const count = (tone: string) => rows.filter((r) => r.tone === tone).length;
  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">トップ</Link> / <Link href="/funding/">資金調達</Link> / <span>投資家</span></nav>
      <div className="page-head">
        <div className="kicker">Investors</div>
        <h1>ヘルスケアに投資している投資家</h1>
        <p className="lead">このデータベースに載っているヘルスケア企業の資金調達から、引受先（出資した会社）をまとめました。ファンド名は運用会社にまとめています。2社以上に出資した{rows.length}の投資家を、いつ出し始め、いまも出しているかと一緒に見られます。</p>
      </div>
      <section className="bt-kpi">
        <div><span>投資家</span><b>{rows.length}</b><small>2社以上に出資</small></div>
        <div><span>最近ふえている</span><b>{count('up')}</b><small>直近3年の出資がそれまでより多い</small></div>
        <div><span>最近出し始めた</span><b>{count('new')}</b><small>2024年以降に初めて記録</small></div>
        <div><span>最近は記録なし</span><b>{count('stop')}</b><small>2023年以前が最後</small></div>
      </section>
      <InvestorTable rows={rows} types={INVESTOR_TYPES} years={YEARS} />
      <p className="muted small" style={{ marginTop: 12 }}>出典：各社の資金調達の発表。このデータベースに載っている会社への出資だけを数えています（融資・個人投資家の総称は除く）。「記録なし」は、このデータベースで見つかっていないという意味です。</p>
    </>
  );
}
