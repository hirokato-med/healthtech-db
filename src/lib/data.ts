import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { renderMarkdown } from './markdown';
import type {
  Article, ArticleMeta, ArchiveArticle, Category, Company, NewsItem, Overseas, Person, Service, Webinar,
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
export const getWebinars = () => memo('webinars', () => read<Webinar[]>('webinars.json'));
export const getArchiveArticles = () => memo('archive', () => read<ArchiveArticle[]>('archive-articles.json'));

/** 社名のゆらぎ（株式会社・空白・大文字小文字）を潰して比較する */
export const normalizeName = (s: string) =>
  s
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
    all.find((c) => {
      const cn = normalizeName(c.name);
      return cn.length >= 4 && n.length >= 4 && (cn.includes(n) || n.includes(cn));
    })
  );
};

export const getServices = () =>
  memo('services', () =>
    read<Service[]>('services.json').map((s) => ({ ...s, companyId: s.companyId ?? findCompanyByName(s.company)?.id })),
  );
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
          html: renderMarkdown(content),
        } satisfies Article;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  });
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
