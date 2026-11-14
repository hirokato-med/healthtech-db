import type { Service } from '@/lib/types';
import { ym } from '@/lib/ym';

/** 止まったあと：起きた出来事と、サービスの扱い（と確認時点）を分けて出す */
export function AfterEnd({ a, compact }: { a: NonNullable<Service['after']>; compact?: boolean }) {
  const fate = a.fate === '未確認' ? '提供状況は未確認' : a.fate;
  return (
    <p className={`after-end${compact ? ' small' : ''}`}>
      <b>その後</b>{a.event}／サービス：{fate}{a.note ? `（${a.note}）` : ''}
      <span className="muted small">　{ym(a.asOf).replace('（予定）', '')}時点の資料による</span>
    </p>
  );
}
