'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Category, Company } from '@/lib/types';

type Lite = Pick<Company, 'id' | 'name' | 'categories' | 'description' | 'prefecture' | 'foundedYear' | 'exit'>;
const initialOf = (name: string) => name.replace(/^(株式会社|有限会社|合同会社)\s*/, '').replace(/\s*株式会社$/, '').trim().slice(0, 1).toUpperCase();
const PAGE = 40;

export function CompanyFilter({ companies, categories, initialCategory = '' }: { companies: Lite[]; categories: Category[]; initialCategory?: string }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(initialCategory);
  const [exit, setExit] = useState('');
  const [pref, setPref] = useState('');
  const [shown, setShown] = useState(PAGE);
  const prefs = useMemo(() => [...new Set(companies.map((c) => c.prefecture).filter(Boolean))].sort(), [companies]);
  const catOf = useMemo(() => Object.fromEntries(categories.map((c) => [c.slug, c])), [categories]);
  const hit = useMemo(() => {
    const n = q.trim().toLowerCase();
    return companies.filter(
      (c) => (!cat || c.categories.includes(cat)) && (!exit || c.exit === exit) && (!pref || c.prefecture === pref) &&
        (!n || c.name.toLowerCase().includes(n) || c.description.toLowerCase().includes(n)),
    );
  }, [companies, q, cat, exit, pref]);
  const reset = () => setShown(PAGE);

  return (
    <>
      <div className="filterbar">
        <input type="search" placeholder="社名・事業内容で絞り込み" value={q} onChange={(e) => { setQ(e.target.value); reset(); }} aria-label="社名で絞り込み" />
        <select value={cat} onChange={(e) => { setCat(e.target.value); reset(); }} aria-label="カテゴリ">
          <option value="">すべてのカテゴリ</option>
          {(['disease', 'solution', 'domain'] as const).map((g) => (
            <optgroup key={g} label={categories.find((c) => c.group === g)?.groupLabel ?? g}>
              {categories.filter((c) => c.group === g).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </optgroup>
          ))}
        </select>
        <select value={exit} onChange={(e) => { setExit(e.target.value); reset(); }} aria-label="上場区分">
          <option value="">上場区分</option><option>上場</option><option>未上場</option><option>バイアウト</option>
        </select>
        <select value={pref} onChange={(e) => { setPref(e.target.value); reset(); }} aria-label="本社所在地">
          <option value="">所在地</option>
          {prefs.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>
      <p className="count-text" style={{ margin: '0 0 4px' }}><b>{hit.length}</b> 社が該当</p>
      <div className="rows">
        {hit.slice(0, shown).map((c) => {
          const color = catOf[c.categories[0]]?.color ?? '#1E6FE8';
          return (
            <article className="item" key={c.id}>
              <div className="body">
                <span className="labels">
                  {c.categories.map((s) => <Link key={s} href={`/categories/${s}/`} className="label" style={{ color: catOf[s]?.color }}>{catOf[s]?.name ?? s}</Link>)}
                </span>
                <Link href={`/companies/${c.id}/`} className="title">{c.name}</Link>
                {c.description && <p className="desc">{c.description}</p>}
                <div className="meta">
                  {c.prefecture && <span className="tag">{c.prefecture}</span>}
                  {c.foundedYear && <span className="tag">{c.foundedYear}年創業</span>}
                  <span className={`tag ${c.exit === '上場' ? 'listed' : ''}`}>{c.exit}</span>
                </div>
              </div>
              <span className="tile" style={{ background: color }} aria-hidden="true">{initialOf(c.name)}</span>
            </article>
          );
        })}
      </div>
      {shown < hit.length && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button type="button" className="btn" onClick={() => setShown((n) => n + PAGE)}>さらに表示（残り {hit.length - shown} 社）</button>
        </div>
      )}
    </>
  );
}
