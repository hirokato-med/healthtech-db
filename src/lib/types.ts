export type Category = {
  slug: string;
  name: string;
  group: 'disease' | 'solution' | 'domain';
  groupLabel: string;
  /** 表示色（data.ts で割り当て） */
  color: string;
};

export type Company = {
  id: string;
  name: string;
  hp: string;
  categories: string[];
  categoryLabel: string;
  description: string;
  prefecture: string;
  foundedYear: number | null;
  address: string;
  employees: string;
  founders: string[];
  representatives: string[];
  exit: string;
  parentCompany: string;
  relatedCompanies: string[];
  corporateNumber: string;
  corporateNumberUrl: string;
  region: 'JP';
  source: string;
};

export type Overseas = {
  id: string;
  name: string;
  country: string;
  region: 'US' | 'EU' | 'ASIA';
  foundedYear: number | null;
  hp: string;
  exit: string;
  founders: string[];
  note: string;
  areas: string[];
};

export type PersonRole = { companyId: string; companyName: string; title: string };
export type Person = { id: string; name: string; roles: PersonRole[]; bio?: string; twitter?: string };

export type Service = {
  id: string;
  name: string;
  company: string;
  companyId?: string;
  category: string;
  description: string;
  hp: string;
  startedYear: number | null;
  status: '継続中' | '終了' | '不明';
  tags?: string[];
};

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  company: string;
  companyId: string | null;
  publishedAt: string;
  category: string | null;
  source: 'prtimes' | 'manual';
};

export type Webinar = { vol: number | null; date: string; title: string; note?: string; url?: string };

export type ArticleMeta = {
  slug: string;
  title: string;
  date: string;
  category: string;
  author: string;
  summary: string;
  featured?: boolean;
  tags?: string[];
  companies?: string[];
};
export type Article = ArticleMeta & { html: string };

export type ArchiveArticle = { title: string; category: string; author: string; status: string };
