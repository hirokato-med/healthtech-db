export type Category = {
  slug: string;
  name: string;
  group: 'disease' | 'solution' | 'domain';
  groupLabel: string;
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
  /** 2026年以降に編集部が追加・確認した項目 */
  listedMarket?: string;
  /** 合弁・子会社として生まれた会社の成り立ち（例: DeNAと住友商事のJV） */
  origin?: string;
  formerNames?: string[];
  /** 交代した前の代表者（until は交代した年月 YYYY-MM／YYYY。不明なら空） */
  formerRepresentatives?: { name: string; until?: string; note?: string }[];
  products?: string[];
  /** 事業概要（150〜250字）。description は一覧カード用の短い説明 */
  overview?: string;
  /** 事業転換などでヘルスケアとの関係が薄くなった会社の注記 */
  scopeNote?: string;
  /** 事業の継続が確認できない会社の注記（厚生年金の全喪など） */
  statusNote?: string;
  employeesAsOf?: string;
  totalFunding?: string;
  highlight?: string;
  history?: { date: string; text: string }[];
  sources?: string[];
  updatedAt?: string;
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

/** YouTube「#月刊ヘルステック」の1回分（pipeline/youtube.mjs が data/monthly.json に書く） */
export type MonthlyEpisode = { videoId: string; title: string; month: string; theme: string; url: string };

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
