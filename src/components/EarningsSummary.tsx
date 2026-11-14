import { growthBasis, isIfrs, itemLabels, change, changeOf, comparable, forecastLabel, notComparableText, forecastOf, forecastRangeOf, forecastText, money, noForecastText, periodRange } from '@/lib/earnings';
import type { EarningsReport } from '@/lib/types';

const ROWS0: [keyof NonNullable<EarningsReport['current']>, string][] = [
  ['revenue', '売上高'],
  ['operatingIncome', '営業利益'],
  ['ordinaryIncome', '経常利益'],
  ['netIncome', '純利益'],
];

/** 決算の概要（今期・前年同期・前年同期比を表にし、会社予想をひとことで添える） */
export function EarningsSummary({ r, prevForecast }: { r: EarningsReport; prevForecast?: { label: string; fig: NonNullable<EarningsReport['forecast']> } }) {
  const q = r.quarter !== 'FY';
  const f = forecastOf(r);
  // 売上の科目名は会社ごとに違う（売上収益・事業収益・経常収益など）ので、表も予想の文も決算短信の呼び名で出す
  const L = itemLabels(r);
  const ROWS = ROWS0.map(([k]) => [k, L[k]] as [typeof k, string]);
  const rows = ROWS.filter(([k]) => r.current?.[k] != null);
  const fcText = (() => {
    // レンジで開示された予想は「下限〜上限」で書く（増減率は出さない）
    const rg = forecastRangeOf(r);
    if (!f && rg) return `${forecastLabel(r)}はレンジで開示：${ROWS.filter(([k]) => forecastText(r, k)).map(([k, l]) => `${l}${forecastText(r, k)}`).join('・')}。`;
    if (!f) return `${noForecastText(r)}。`;
    const base = q ? undefined : r.current; // 通期決算なら次期予想を当期実績と比べる
    const parts = ROWS.filter(([k]) => f[k] != null).map(([k, l]) => {
      const c = base ? change(f[k], base[k]) : undefined;
      return `${l}${money(f[k])}${c && c.text !== '—' ? `（${c.text.replace(/^\+/, '前期比+').replace(/^-/, '前期比-')}）` : ''}`;
    });
    const rev = prevForecast ? ROWS.filter(([k]) => f[k] != null && prevForecast.fig[k] != null && f[k] !== prevForecast.fig[k]) : [];
    return `${forecastLabel(r)}は${parts.join('・')}。${prevForecast ? (rev.length ? `${prevForecast.label}から${rev.map(([, l]) => l).join('・')}を修正。` : `${prevForecast.label}から据え置き。`) : ''}`;
  })();
  return (
    <div className="esum">
      <div className="esum-head">
        <b>{r.fiscalYear} {q ? r.label.replace(/^.*?期 /, '').replace(/（中間期）/, '') + '累計' : '通期'}（{periodRange(r.fiscalYear, r.quarter)}）</b>
        <span>{r.title.match(/業績予想/) ? '業績予想の修正' : '決算短信'}・{r.date.replace(/-/g, '/')}{r.consolidated === false ? '・個別' : ''}</span>
      </div>
      {!comparable(r) && <p className="muted small" style={{ margin: '0 0 6px' }}>{notComparableText(r)}（変則決算・決算期変更）。前年同期比は出していません。</p>}
      <table>
        <thead><tr><th /><th>{q ? '今期（累計）' : '今期'}</th><th>前年同期</th><th>前年同期比</th></tr></thead>
        <tbody>
          {rows.map(([k, l]) => {
            const c = comparable(r) ? changeOf(r, k) : { text: '比較なし', tone: '' as const };
            return (
              <tr key={k}>
                <th scope="row">{l}</th>
                <td className="v">{money(r.current?.[k])}</td>
                <td className="p">{money(r.prior?.[k])}</td>
                <td className={`c ${c.tone}`}>{c.text}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="esum-note">{k2note(r)}</p>
      {fcText && (
        <div className="esum-fc">
          <span>会社予想</span>
          <p>{fcText}</p>
        </div>
      )}
    </div>
  );
}
const k2note = (r: EarningsReport) =>
  `金額は決算短信のサマリーより。${r.quarter !== 'FY' ? '四半期は期初からの累計。' : ''}${isIfrs(r) ? 'IFRS の科目名で表示。' : '純利益は親会社株主に帰属する当期純利益（個別決算の会社は当期純利益）。'}前年同期比は会社が開示した増減率（${growthBasis(r) === '概算' ? 'ここは開示値を取得できず、百万円に丸めた数字からの概算で「約」を付けています' : '取得できないときは計算した値'}）。`;
