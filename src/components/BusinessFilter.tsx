'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Category, Service } from '@/lib/types';

type Lite = Pick<Service, 'id' | 'name' | 'company' | 'companyId' | 'category' | 'description' | 'status' | 'startedAt' | 'startedYear' | 'endedAt' | 'endReasons'>;
const STATUSES = ['提供中', '終了', '譲渡', '統合', '休止', '不明'] as const;
const ym = (s?: string) => (s ? s.replace(/^(\d{4})-(\d{2}).*$/, (_, y, m) => `${y}年${Number(m)}月`).replace(/^(\d{4})$/, '$1年') : '');

export function BusinessFilter({ items, categories, reasons, initialStatus = '' }: { items: Lite[]; categories: Category[]; reasons: Record<string, { label: string }>; initialStatus?: string }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [reason, setReason] = useState('');
  const [cat, setCat] = useState('');
  const catName = useMemo(() => Object.fromEntries(categories.map((c) => [c.slug, c.name])), [categories]);
  const hit = useMemo(() => {
    const n = q.trim().toLowerCase();
    return items.filter(
      (s) =>
        (!status || (status === '止まった事業' ? s.status !== '提供中' && s.status !== '不明' : s.status === status)) &&
        (!reason || s.endReasons?.includes(reason)) &&
        (!cat || s.category === cat) &&
        (!n || `${s.name} ${s.company} ${s.description}`.toLowerCase().includes(n)),
    );
  }, [items, q, status, reason, cat]);

  return (
    <>
      <div className="filterbar">
        <input type="search" placeholder="事業名・会社名・内容で絞り込み" value={q} onChange={(e) => setQ(e.target.value)} aria-label="キーワード" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="状態">
          <option value="">すべての状態</option>
          <option value="止まった事業">止まった事業（終了・譲渡・統合・休止）</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="止まった理由">
          <option value="">止まった理由</option>
          {Object.entries(reasons).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="カテゴリ">
          <option value="">すべてのカテゴリ</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <span className="count">{hit.length} 件</span>
      </div>
      <div className="grid wide">
        {hit.map((s) => (
          <article className="card biz" key={s.id}>
            <Link href={`/services/${s.id}/`} className="title">{s.name}</Link>
            <div className="chips">
              <span className={`badge st-${s.status}`}>{s.status}</span>
              {s.category && <Link href={`/categories/${s.category}/`} className="chip">{catName[s.category] ?? s.category}</Link>}
              {s.endReasons?.filter((r) => r !== 'unknown').map((r) => <span key={r} className="chip ghost">{reasons[r]?.label ?? r}</span>)}
            </div>
            <p className="desc">{s.description}</p>
            <div className="meta">
              {s.companyId ? <Link href={`/companies/${s.companyId}/`}>{s.company}</Link> : <span>{s.company}</span>}
              <span>{ym(s.startedAt) || (s.startedYear ? `${s.startedYear}年` : '')}{(s.startedAt || s.startedYear) && ' 〜 '}{ym(s.endedAt)}</span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
