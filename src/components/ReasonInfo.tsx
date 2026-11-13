import type { Service } from '@/lib/types';

/** 止まった理由の出どころ：情報源・理由の記載・編集上の解釈を分けて出す */
export function ReasonInfo({ i, compact }: { i: NonNullable<Service['endReasonInfo']>; compact?: boolean }) {
  return (
    <p className={`reason-info${compact ? ' compact' : ''}`}>
      <span><i>情報源</i>{i.sources.length ? i.sources.map((x) => <b key={x} className={`basis basis-${x}`}>{x}</b>) : <b className="basis">—</b>}</span>
      <span><i>理由の記載</i><b className="basis">{i.stated}</b></span>
      {(!compact || i.interpretation !== 'なし') && <span><i>編集上の解釈</i><b className={`basis${i.interpretation === '推定を含む' ? ' basis-推定' : ''}`}>{i.interpretation}</b></span>}
    </p>
  );
}
