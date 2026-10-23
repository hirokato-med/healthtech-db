import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { renderMarkdown } from './markdown';
import { withBase } from './base';
import type {
  Article, ArticleMeta, ArchiveArticle, Category, Company, MonthlyEpisode, NewsItem, Overseas, Partnership, Person, Service, Theme,
} from './types';

const ROOT = process.cwd();
const read = <T,>(file: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', file), 'utf8')) as T;
const cache = new Map<string, unknown>();
const memo = <T,>(key: string, fn: () => T): T => {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key) as T;
};

export const getCategories = () => memo('categories', () => read<Category[]>('categories.json'));
export const getCategory = (slug: string) => getCategories().find((c) => c.slug === slug);
export const categoryName = (slug: string) => getCategory(slug)?.name ?? slug;

export const getCompanies = () => memo('companies', () => read<Company[]>('companies.json'));
export const getCompany = (id: string) => getCompanies().find((c) => c.id === id);
export const getOverseas = () => memo('overseas', () => read<Overseas[]>('overseas.json'));
export const getPeople = () => memo('people', () => read<Person[]>('people.json'));
export const getPerson = (id: string) => getPeople().find((p) => p.id === id);
/** 月刊ヘルステック（新しい順） */
export const getMonthly = () =>
  memo('monthly', () => {
    const file = path.join(ROOT, 'data', 'monthly.json');
    if (!fs.existsSync(file)) return [] as MonthlyEpisode[];
    return (JSON.parse(fs.readFileSync(file, 'utf8')) as MonthlyEpisode[]).sort((a, b) => b.month.localeCompare(a.month));
  });
export const monthLabel = (m: string) => {
  const [y, mo] = m.split('-');
  return `${y}年${Number(mo)}月`;
};
/** 番組名の飾りを外した、その回の見出し */
export const episodeHeadline = (e: MonthlyEpisode) => e.theme || `${Number(e.month.slice(5))}月のヘルステックニュース振り返り`;
export const ytThumb = (id: string, q: 'hq' | 'mq' | 'maxres' = 'hq') => `https://i.ytimg.com/vi/${id}/${q}default.jpg`;
export const YT_CHANNEL = 'https://www.youtube.com/@digitalhealthch';
export const YT_SUBSCRIBE = 'https://www.youtube.com/@digitalhealthch?sub_confirmation=1';
export const getArchiveArticles = () => memo('archive', () => read<ArchiveArticle[]>('archive-articles.json'));

/** 社名のゆらぎ（株式会社・空白・大文字小文字）を潰して比較する */
export const normalizeName = (s: string) =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/株式会社|有限会社|合同会社|（株）|\(株\)|inc\.?|co\.,? ?ltd\.?|corporation|k\.k\./g, '')
    .replace(/[\s　・,.、。()（）「」]/g, '')
    .trim();

export const findCompanyByName = (name: string): Company | undefined => {
  if (!name) return undefined;
  const n = normalizeName(name);
  if (!n) return undefined;
  const all = getCompanies();
  return (
    all.find((c) => normalizeName(c.name) === n) ??
    all.find((c) => [...(c.aliases ?? []), ...(c.formerNames ?? [])].some((a) => normalizeName(a) === n)) ??
    all.find((c) => {
      const cn = normalizeName(c.name);
      return cn.length >= 4 && n.length >= 4 && (cn.includes(n) || n.includes(cn));
    })
  );
};

export const getServices = () =>
  memo('services', () =>
    read<Service[]>('services.json').map((s) => ({ ...s, status: (s.status as string) === '継続中' ? '提供中' : s.status, companyId: s.companyId ?? findCompanyByName(s.company)?.id })),
  );
/** 事業が止まった理由の分類 */
export const END_REASONS: Record<string, { label: string; note: string }> = {
  regulation: { label: '規制・承認', note: '薬機法の承認、医療法・医師法などの規制が壁になった' },
  reimbursement: { label: '保険償還・診療報酬', note: '保険適用や診療報酬上の評価が得られない、価格が合わない' },
  'no-payer': { label: 'お金を払う人がいない', note: '患者・医療機関・企業・保険者のいずれも、必要な単価で払わなかった' },
  workflow: { label: '現場に定着しない', note: '医療・介護現場の業務に入り込めず、使われ続けなかった' },
  evidence: { label: '効果を示せない', note: '臨床試験・実証で、期待した効果を示せなかった' },
  funding: { label: '資金が続かない', note: '資金調達が続かず、事業を続けられなかった' },
  'parent-strategy': { label: '親会社の方針', note: '親会社・グループの選択と集中で、終了・移管された' },
  acquisition: { label: '買収・統合', note: '他社に買収・統合され、事業は別の形で続いている' },
  competition: { label: '競合・大手の参入', note: '競合や大手の参入で、事業が成り立たなくなった' },
  team: { label: '体制の問題', note: '創業者の離脱など、体制の問題（本人が公表したもの）' },
  infrastructure: { label: '通信・部品の終了', note: '3G停波やセンサー・部品の生産終了など、事業が依存していた基盤がなくなった' },
  unknown: { label: '理由は非公表', note: '止まった理由は公表されていない' },
};
export const STOPPED = ['終了', '譲渡', '統合', '休止'];
export const getPartnerships = () => memo('partnerships', () => read<Partnership[]>('partnerships.json'));
export const getThemes = () => memo('themes', () => read<Theme[]>('themes.json'));
export const servicesInTheme = (slug: string) => getServices().filter((s) => s.themes?.includes(slug));

export const getService = (id: string) => getServices().find((s) => s.id === id);
export const servicesOf = (companyId: string) => getServices().filter((s) => s.companyId === companyId);

export const getNews = () =>
  memo('news', () => {
    const file = path.join(ROOT, 'data', 'news.json');
    if (!fs.existsSync(file)) return [] as NewsItem[];
    return (JSON.parse(fs.readFileSync(file, 'utf8')) as NewsItem[]).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  });
export const newsOf = (company: Company) => {
  const n = normalizeName(company.name);
  return getNews().filter((x) => x.companyId === company.id || (n.length >= 4 && normalizeName(x.company).includes(n)));
};

export const peopleOf = (companyId: string) => getPeople().filter((p) => p.roles.some((r) => r.companyId === companyId));
export const companiesIn = (slug: string) => getCompanies().filter((c) => c.categories.includes(slug));
export const servicesIn = (slug: string) => getServices().filter((s) => s.category === slug);

// ---- 記事（content/articles/*.md） ----
const ARTICLES = path.join(ROOT, 'content', 'articles');
export const getArticles = (): Article[] =>
  memo('articles', () => {
    if (!fs.existsSync(ARTICLES)) return [];
    return fs
      .readdirSync(ARTICLES)
      .filter((f) => f.endsWith('.md'))
      .map((f) => {
        const raw = fs.readFileSync(path.join(ARTICLES, f), 'utf8');
        const { data, content } = matter(raw);
        const meta = data as Partial<ArticleMeta>;
        return {
          slug: meta.slug ?? f.replace(/\.md$/, ''),
          title: meta.title ?? f,
          date: String(meta.date ?? ''),
          category: meta.category ?? '',
          author: meta.author ?? 'Healthtech DB 編集部',
          summary: meta.summary ?? '',
          featured: Boolean(meta.featured),
          tags: meta.tags ?? [],
          companies: meta.companies ?? [],
          html: linkCompaniesInTables(renderMarkdown(content)),
        } satisfies Article;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  });
/**
 * 記事の表のセルに書かれた会社名を、企業DBのページへのリンクにする。
 * 「、」区切りの1項目が社名（または別名・旧社名）と完全に一致するときだけ。後ろの（49%）などの注記は残す。
 */
function linkCompaniesInTables(html: string): string {
  const exact = (name: string) => {
    const n = normalizeName(name);
    if (n.length < 2) return undefined;
    const all = getCompanies();
    return all.find((c) => normalizeName(c.name) === n) ?? all.find((c) => [...(c.aliases ?? []), ...(c.formerNames ?? [])].some((a) => normalizeName(a) === n));
  };
  return html.replace(/<td( class="nw")?>([^<]*)<\/td>/g, (_, cls = '', cell: string) => {
    const parts = cell.split(/(、|，|\/|／)/).map((seg) => {
      const m = seg.match(/^(\s*)(.+?)((?:（[^）]*）|\([^)]*\))?\s*)$/);
      if (!m) return seg;
      const c = exact(m[2]);
      return c ? `${m[1]}<a href="${withBase(`/companies/${c.id}/`)}">${m[2]}</a>${m[3]}` : seg;
    });
    return `<td${cls}>${parts.join('')}</td>`;
  });
}

export const getArticle = (slug: string) => getArticles().find((a) => a.slug === slug);
export const articlesIn = (slug: string) => getArticles().filter((a) => a.category === slug);

/** 当時の「初期強化企業リスト」（2021-12）に載っていた注目企業 */
export const FEATURED_COMPANY_NAMES = [
  'アイリス', 'Ubie', 'micin', 'AIメディカル', 'LincWell', 'エルピクセル', 'FiNC', 'スマルナ', 'カケハシ', 'メダップ', 'コントレア',
  'ノックオンザドア', 'SaveMedical', 'PREVENT', 'TXP Medical', 'Splink', 'アガサ', 'oui inc', 'T-ICU', 'CureApp', 'ファミワン', 'MG-DX', '3sunny', 'miup',
];
export const getFeaturedCompanies = () =>
  memo('featured', () => FEATURED_COMPANY_NAMES.map((n) => findCompanyByName(n)).filter((c): c is Company => Boolean(c)));

export const fmtDate = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};
