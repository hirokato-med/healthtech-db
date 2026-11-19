'use client';
import { STATUS_GROUPS } from '@/lib/status';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Category, Service } from '@/lib/types';

/**
 * 一覧のカードに使う項目。表示のラベル・色・絞り込みの区分・止まった事業か・期間の文は、
 * 事業ページと同じ関数（src/lib/status.ts）でサーバー側で作って渡す（クライアントで status から作り直さない）
 */
export type Lite = Pick<Service, 'id' | 'name' | 'company' | 'companyId' | 'category' | 'description' | 'endReasons'> & {
  label: string;
  cls: string;
  group: string;
  stopped: boolean;
  /** 終了・譲渡の予定が発表された（まだ提供中） */
  planned: boolean;
  period: string;
};

export function BusinessFilter({ items, categories, reasons, initialStatus = '' }: { items: Lite[]; categories: Category[]; reasons: Record<string, { label: string }>; initialStatus?: string }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [reason, setReason] = useState('');
  const [cat, setCat] = useState('');
  // 件数が多いので最初は一部だけ出し、「さらに表示」で足す（絞り込みを変えたら戻す）
  const PAGE = 60;
  const [shown, setShown] = useState(PAGE);
  const catName = useMemo(() => Object.fromEntries(categories.map((c) => [c.slug, c.name])), [categories]);
  const hit = useMemo(() => {
    const n = q.trim().toLowerCase();
    return items.filter(
      (s) =>
        (!status || (status === '止まった事業' ? s.stopped : s.group === status)) &&
        // 止まった理由で絞り込むのは、止まった事業だけ（予定が発表されたものは理由の欄に「予定」と出す）
        (!reason || (s.stopped && s.endReasons?.includes(reason))) &&
        (!cat || s.category === cat) &&
        (!n || `${s.name} ${s.company} ${s.description}`.toLowerCase().includes(n)),
    );
  }, [items, q, status, reason, cat]);
  const filterKey = `${q}|${status}|${reason}|${cat}`;
  const [lastKey, setLastKey] = useState(filterKey);
  if (lastKey !== filterKey) { setLastKey(filterKey); setShown(PAGE); }

  return (
    <>
      <div className="filterbar">
        <input type="search" placeholder="事業名・会社名・内容で絞り込み" value={q} onChange={(e) => setQ(e.target.value)} aria-label="キーワード" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="状態">
          <option value="">すべての状態</option>
          <option value="止まった事業">止まった事業（終了・譲渡・統合・休止）</option>
          {STATUS_GROUPS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="止まった理由">
          <option value="">止まった理由（止まった事業のみ）</option>
          {Object.entries(reasons).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="カテゴリ">
          <option value="">すべてのカテゴリ</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <span className="count">{hit.length} 件</span>
      </div>
      <div className="grid wide">
        {hit.slice(0, shown).map((s) => (
          <article className="card biz" key={s.id}>
            <Link href={`/services/${s.id}/`} className="title">{s.name}</Link>
            <div className="chips">
              <span className={`badge st-${s.cls}`}>{s.label}</span>
              {s.category && <Link href={`/services/c/${s.category}/`} className="chip">{catName[s.category] ?? s.category}</Link>}
              {/* 理由のチップは止まった事業だけ。終了・譲渡の予定が発表されたものは「予定の理由」と前置きする */}
              {(s.stopped || s.planned) && s.endReasons?.filter((r) => r !== 'unknown').map((r) => <span key={r} className="chip ghost">{s.stopped ? '' : '予定の理由：'}{reasons[r]?.label ?? r}</span>)}
            </div>
            <p className="desc">{s.description}</p>
            <div className="meta">
              {s.companyId ? <Link href={`/companies/${s.companyId}/`}>{s.company}</Link> : <span>{s.company}</span>}
              <span>{s.period}</span>
            </div>
          </article>
        ))}
      </div>
      {hit.length > shown && (
        <div className="more-wrap">
          <button type="button" className="btn-more" onClick={() => setShown(shown + PAGE)}>さらに表示（残り {hit.length - shown} 件）</button>
        </div>
      )}
    </>
  );
}
