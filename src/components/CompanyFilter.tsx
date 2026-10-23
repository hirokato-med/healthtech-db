'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Category, Company } from '@/lib/types';

type Lite = Pick<Company, 'id' | 'name' | 'categories' | 'description' | 'prefecture' | 'foundedYear' | 'exit'> & { isNew?: boolean; aliases?: string[] };

/** 閉鎖・合併・対象外は、記録として残すが一覧では既定で隠す */
const ENDED = ['閉鎖', '合併', '対象外'];

export function CompanyFilter({ companies, categories, initialCategory = '' }: { companies: Lite[]; categories: Category[]; initialCategory?: string }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(initialCategory);
  const [exit, setExit] = useState('');
  const [pref, setPref] = useState('');
  const [sort, setSort] = useState('');
  const [showEnded, setShowEnded] = useState(false);
  const endedCount = useMemo(() => companies.filter((c) => ENDED.includes(c.exit)).length, [companies]);
  const prefs = useMemo(() => [...new Set(companies.map((c) => c.prefecture).filter(Boolean))].sort(), [companies]);
  const catName = useMemo(() => Object.fromEntries(categories.map((c) => [c.slug, c])), [categories]);
  const hit = useMemo(() => {
    const n = q.trim().toLowerCase();
    const list = companies.filter(
      (c) =>
        (!cat || c.categories.includes(cat)) &&
        (exit ? c.exit === exit : showEnded || !ENDED.includes(c.exit)) &&
        (!pref || c.prefecture === pref) &&
        (!n || c.name.toLowerCase().includes(n) || c.description.toLowerCase().includes(n) || !!c.aliases?.some((a) => a.toLowerCase().includes(n))),
    );
    if (sort === 'founded') return [...list].sort((a, b) => (b.foundedYear ?? 0) - (a.foundedYear ?? 0));
    if (sort === 'new') return [...list].sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew));
    return list;
  }, [companies, q, cat, exit, pref, sort, showEnded]);

  return (
    <>
      <div className="filterbar">
        <input type="search" placeholder="社名・事業内容で絞り込み" value={q} onChange={(e) => setQ(e.target.value)} aria-label="社名で絞り込み" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="カテゴリ">
          <option value="">すべてのカテゴリ</option>
          {(['disease', 'solution', 'domain'] as const).map((g) => (
            <optgroup key={g} label={categories.find((c) => c.group === g)?.groupLabel ?? g}>
              {categories.filter((c) => c.group === g).map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <select value={exit} onChange={(e) => setExit(e.target.value)} aria-label="上場区分">
          <option value="">上場区分</option>
          <option>上場</option>
          <option>未上場</option>
          <option>バイアウト</option>
          <option>閉鎖</option>
          <option>合併</option>
          <option>対象外</option>
        </select>
        <select value={pref} onChange={(e) => setPref(e.target.value)} aria-label="本社所在地">
          <option value="">所在地</option>
          {prefs.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="並び順">
          <option value="">掲載順</option>
          <option value="new">新しく追加した企業</option>
          <option value="founded">創業が新しい順</option>
        </select>
        <label className="ended-toggle"><input type="checkbox" checked={showEnded} onChange={(e) => setShowEnded(e.target.checked)} />事業を終えた会社も表示（{endedCount}社）</label>
        <span className="count">{hit.length} 社</span>
      </div>
      <div className="grid">
        {hit.map((c) => (
          <article className="card" key={c.id}>
            <Link href={`/companies/${c.id}/`} className="title">
              {c.name}
            </Link>
            {c.isNew && <span className="badge new">NEW</span>}
            <div className="chips">
              {c.categories.map((s) => (
                <Link key={s} href={`/categories/${s}/`} className={`chip ${catName[s]?.group ?? ''}`}>
                  {catName[s]?.name ?? s}
                </Link>
              ))}
            </div>
            {c.description && <p className="desc">{c.description}</p>}
            <div className="meta">
              {c.prefecture && <span>{c.prefecture}</span>}
              {c.foundedYear && <span>{c.foundedYear}年創業</span>}
              <span className={`badge ${c.exit === '上場' ? 'listed' : ENDED.includes(c.exit) ? 'closed' : ''}`}>{c.exit}</span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
