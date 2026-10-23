import type { Metadata } from 'next';
import Link from 'next/link';
import { EarningsBars } from '@/components/EarningsBars';
import { findCompanyByName, getCompanies, getFundings } from '@/lib/data';
import { money } from '@/lib/earnings';
import { fundingSummary, investorKey, isRaise, roundLabel, ymJa } from '@/lib/funding';

export const metadata: Metadata = {
  title: 'ヘルスケア企業の資金調達',
  description: '国内ヘルスケア企業の資金調達（ラウンド・金額・引受先）。会社と引受先の発表で確かめたものだけを集めています。',
};

const NOT_INVESTOR = /個人|ほか|他\d*名|他\d*社|既存株主|既存投資家|エンジェル|非公表|複数|金融機関|事業会社$/;

export default function FundingPage() {
  const fundings = getFundings();
  const companies = getCompanies();
  const byId = Object.fromEntries(companies.map((c) => [c.id, c]));
  const short = (n: string) => n.replace(/^株式会社|株式会社$/g, '');

  const all = Object.entries(fundings).flatMap(([id, f]) => f.rounds.filter(isRaise).map((r) => ({ id, r })));
  const recent = [...all].sort((a, b) => b.r.date.localeCompare(a.r.date)).slice(0, 40);

  const ranking = Object.entries(fundings)
    .map(([id, f]) => ({ id, s: fundingSummary(f)! }))
    .filter((x) => x.s.total)
    .sort((a, b) => b.s.total!.amount - a.s.total!.amount)
    .slice(0, 30);
  const top = ranking[0]?.s.total?.amount ?? 1;

  // 引受先：何社に出資しているか（同じ会社への複数回は1社と数える）
  const inv = new Map<string, { name: string; ids: Set<string>; leads: number }>();
  for (const { id, r } of all) {
    for (const n of r.investors ?? []) {
      const k = investorKey(n);
      if (k.length < 2 || NOT_INVESTOR.test(n)) continue;
      const e = inv.get(k) ?? { name: n.replace(/[（(].*?[)）]/g, '').trim(), ids: new Set<string>(), leads: 0 };
      e.ids.add(id);
      if (r.lead && investorKey(r.lead) === k) e.leads++;
      inv.set(k, e);
    }
  }
  const investors = [...inv.values()].filter((e) => e.ids.size >= 3).sort((a, b) => b.ids.size - a.ids.size || b.leads - a.leads).slice(0, 25);

  // 年ごとの件数と公表額
  const years = new Map<string, { n: number; sum: number }>();
  for (const { r } of all) {
    const y = r.date.slice(0, 4);
    const e = years.get(y) ?? { n: 0, sum: 0 };
    e.n++;
    e.sum += r.amount ?? 0;
    years.set(y, e);
  }
  const yrs = [...years.entries()].filter(([y]) => Number(y) >= 2014).sort((a, b) => a[0].localeCompare(b[0]));
  const withRounds = Object.values(fundings).filter((f) => f.rounds.some(isRaise)).length;

  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">トップ</Link> / <span>資金調達</span></nav>
      <div className="page-head">
        <div className="kicker">Funding</div>
        <h1>ヘルスケア企業の資金調達</h1>
        <p className="lead">
          掲載企業のうち {Object.keys(fundings).length} 社について、創業からの資金調達を調べました。調達の発表があったのは {withRounds} 社・{all.length} 回です。
          数字は会社と引受先の発表（プレスリリース等）で確かめたものだけを載せ、報道やまとめサイトにしかない金額は載せていません。
        </p>
        <nav className="reason-index" style={{ marginTop: 14 }}>
          <a href="#recent">直近の資金調達<span>{recent.length}</span></a>
          <a href="#ranking">調達額の大きい会社<span>{ranking.length}</span></a>
          <a href="#investors">よく出てくる引受先<span>{investors.length}</span></a>
          <a href="#years">年ごとの推移</a>
        </nav>
      </div>

      <section id="recent" className="ma-sec">
        <h2>直近の資金調達</h2>
        <div className="earn-wrap">
          <table className="earn-table fund-table">
            <thead><tr><th>時期</th><th>会社</th><th>ラウンド</th><th>金額</th><th>リード・引受先</th><th>出典</th></tr></thead>
            <tbody>
              {recent.map(({ id, r }, i) => (
                <tr key={i}>
                  <td className="nw">{ymJa(r.date)}</td>
                  <td className="nw"><Link href={`/companies/${id}/`}>{short(byId[id]?.name ?? id)}</Link></td>
                  <td className="nw">{roundLabel(r)}</td>
                  <td className="num">{r.amount != null ? money(r.amount) : <span className="muted">非公表</span>}</td>
                  <td>{r.lead ? <span className="inv lead">{r.lead}<em>リード</em></span> : (r.investors ?? []).slice(0, 3).join('、')}{!r.lead && (r.investors?.length ?? 0) > 3 ? ` ほか${r.investors!.length - 3}` : ''}</td>
                  <td className="nw"><a href={r.source} target="_blank" rel="noreferrer" className="h-src">出典</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="fund-cols">
        <section id="ranking" className="ma-sec">
          <h2>調達額の大きい会社</h2>
          <p className="muted small">会社が累計を発表していればその額、なければ金額が公表された回の合計（実際より小さいことがあります）。</p>
          <ol className="fund-rank">
            {ranking.map(({ id, s }, i) => (
              <li key={id}>
                <span className="n">{i + 1}</span>
                <span>
                  <Link href={`/companies/${id}/#funding`}>{short(byId[id]?.name ?? id)}</Link>
                  <small>{s.total!.kind === '会社発表の累計' ? `会社発表の累計${s.total!.asOf ? `（${ymJa(s.total!.asOf)}時点）` : ''}・発表 ${s.raises.length}回` : `公表額の合計（${s.raises.length}回のうち${s.known.length}回分）`}{byId[id]?.exit && byId[id].exit !== '未上場' ? `・${byId[id].exit}` : ''}</small>
                  <div className="fund-bar" style={{ width: `${Math.max(2, (s.total!.amount / top) * 100)}%` }} />
                </span>
                <span className="v">{money(s.total!.amount)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section id="investors" className="ma-sec">
          <h2>よく出てくる引受先</h2>
          <p className="muted small">掲載企業のうち何社に出資したか（3社以上）。ファンド名はかっこ書きを外して運営会社の名前でまとめています。</p>
          <ol className="fund-rank">
            {investors.map((e, i) => {
              const o = findCompanyByName(e.name);
              return (
                <li key={e.name}>
                  <span className="n">{i + 1}</span>
                  <span>
                    {o ? <Link href={`/companies/${o.id}/`}>{e.name}</Link> : e.name}
                    <small>{[...e.ids].slice(0, 5).map((id) => short(byId[id]?.name ?? '')).join('、')}{e.ids.size > 5 ? ` ほか${e.ids.size - 5}社` : ''}</small>
                  </span>
                  <span className="v">{e.ids.size}社{e.leads ? <small>リード {e.leads}回</small> : null}</span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <section id="years" className="ma-sec">
        <h2>年ごとの推移</h2>
        <div className="earn-charts">
          <EarningsBars title="調達の発表件数（件）" color="#d08a2c" points={yrs.map(([y, v]) => ({ label: `${y.slice(2)}年`, value: v.n }))} unit="件" />
          <EarningsBars title="公表された調達額の合計（億円）" color="#123e7c" points={yrs.map(([y, v]) => ({ label: `${y.slice(2)}年`, value: Math.round(v.sum / 100) }))} unit="億" />
        </div>
        <p className="muted small" style={{ marginTop: 8 }}>
          掲載企業について集めた分だけの集計です（市場全体ではありません）。直近の年は発表が出そろっていないことがあります。出典：各社・引受先のプレスリリース、公式サイト。
        </p>
      </section>
    </>
  );
}
