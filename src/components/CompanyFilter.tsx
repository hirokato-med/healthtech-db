'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { Category, Company } from '@/lib/types';
import { withBase } from '@/lib/base';

type Lite = Pick<Company, 'id' | 'name' | 'categories' | 'description' | 'prefecture' | 'foundedYear' | 'exit' | 'major' | 'logo'> & { aliases?: string[] };

/** 閉鎖・合併・活動停止・対象外は、記録として残すが一覧では既定で隠す */
const ENDED = ['閉鎖', '合併', '活動停止', '対象外'];
/** 「上場・会社の状態」の選択肢と、その意味（title で出す） */
const EXITS: { value: string; label: string; note: string }[] = [
  { value: '上場', label: '上場', note: '株式を証券取引所に上場している会社' },
  { value: '未上場', label: '未上場', note: '上場していない会社' },
  { value: 'バイアウト', label: 'バイアウト（買収された）', note: '他社に買収され、その会社の子会社などになった会社' },
  { value: '閉鎖', label: '閉鎖', note: '解散・清算・破産などで事業を終えた会社' },
  { value: '合併', label: '合併', note: '吸収合併で法人がなくなった会社（事業は合併先で続いていることがある）' },
  { value: '活動停止', label: '活動停止（確認できず）', note: '解散の登記などは確かめられないが、活動を確かめられない会社' },
  { value: '対象外', label: '対象外', note: 'ヘルスケアの事業をしていないなどの理由で、掲載の対象から外した会社' },
];
/** 一度に出す社数。「もっと見る」で増やす */
const PAGE = 60;
/** URL のクエリに残す絞り込み（共有できるように） */
const KEYS = ['q', 'cat', 'exit', 'pref', 'sort', 'ended'] as const;

export function CompanyFilter({ companies, categories, initialCategory = '' }: { companies: Lite[]; categories: Category[]; initialCategory?: string }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(initialCategory);
  const [exit, setExit] = useState('');
  const [pref, setPref] = useState('');
  const [sort, setSort] = useState('');
  const [showEnded, setShowEnded] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [ready, setReady] = useState(false);
  // 開いたときに URL のクエリから絞り込みを戻す
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('q')) setQ(p.get('q')!);
    if (p.get('cat')) setCat(p.get('cat')!);
    if (p.get('exit')) setExit(p.get('exit')!);
    if (p.get('pref')) setPref(p.get('pref')!);
    if (p.get('sort')) setSort(p.get('sort')!);
    if (p.get('ended') === '1') setShowEnded(true);
    setReady(true);
  }, []);
  // 絞り込みを URL に書く（履歴は増やさない）
  useEffect(() => {
    if (!ready) return;
    const p = new URLSearchParams(window.location.search);
    const v: Record<(typeof KEYS)[number], string> = { q: q.trim(), cat: cat === initialCategory ? '' : cat, exit, pref, sort, ended: showEnded ? '1' : '' };
    for (const k of KEYS) (v[k] ? p.set(k, v[k]) : p.delete(k));
    const s = p.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${s ? `?${s}` : ''}${window.location.hash}`);
  }, [ready, q, cat, exit, pref, sort, showEnded, initialCategory]);
  // 絞り込みを変えたら、出す社数を最初に戻す
  useEffect(() => setLimit(PAGE), [q, cat, exit, pref, sort, showEnded]);

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
    return list;
  }, [companies, q, cat, exit, pref, sort, showEnded]);
  const shown = hit.slice(0, limit);

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
        <select value={exit} onChange={(e) => setExit(e.target.value)} aria-label="上場・会社の状態">
          <option value="">上場・会社の状態</option>
          {EXITS.map((x) => (
            <option key={x.value} value={x.value} title={x.note}>{x.label}</option>
          ))}
        </select>
        <select value={pref} onChange={(e) => setPref(e.target.value)} aria-label="本社所在地">
          <option value="">所在地</option>
          {prefs.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="並び順">
          <option value="">掲載順</option>
          <option value="founded">創業が新しい順</option>
        </select>
        <label className="ended-toggle"><input type="checkbox" checked={showEnded} onChange={(e) => setShowEnded(e.target.checked)} />事業を終えた会社も表示（{endedCount}社）</label>
        <span className="count">{hit.length} 社</span>
      </div>
      <div className="grid">
        {shown.map((c) => (
          <article className="card" key={c.id}>
            {c.logo && <img src={withBase(c.logo.file)} alt="" className={`card-logo ${c.logo.kind} ${c.logo.tone ?? ''} ${c.logo.shape ?? ''}`} loading="lazy" />}
            <Link href={`/companies/${c.id}/`} className="title">
              {c.name}
            </Link>
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
              <span className={`badge ${c.exit === '上場' ? 'listed' : ENDED.includes(c.exit) ? 'closed' : ''}`} title={EXITS.find((x) => x.value === c.exit)?.note}>{c.exit}</span>{c.major ? <span className="badge major">大手</span> : null}
            </div>
          </article>
        ))}
      </div>
      {hit.length > shown.length && (
        <p style={{ textAlign: 'center', marginTop: 20 }}>
          <button type="button" className="btn-more" onClick={() => setLimit((n) => n + PAGE)}>もっと見る（残り {hit.length - shown.length} 社）</button>
        </p>
      )}
    </>
  );
}
