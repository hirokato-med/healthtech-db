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
  /** 親会社についての補足（出資比率・合弁など） */
  parentNote?: string;
  /** 合弁・子会社として生まれた会社の成り立ち（例: DeNAと住友商事のJV） */
  origin?: string;
  formerNames?: string[];
  /** 略称・旧表記（検索用） */
  aliases?: string[];
  /** 大手企業（ヘルステック企業の提携・M&A相手としての掲載） */
  major?: boolean;
  /** ヘルスケアに関わる主なグループ会社（提携・M&Aの記録をこの会社にまとめるのにも使う） */
  groupCompanies?: string[];
  /** ヘルスケアに関わるセグメント名（決算短信のセグメント名。全社がヘルスケアなら「全社」） */
  healthcareSegments?: string[];
  /** 吸収合併で消滅した会社の合併先（exit が「合併」のとき） */
  mergedInto?: { name: string; corporateNumber: string; companyId?: string };
  /** 合併などで法人が入れ替わった場合の旧法人番号（until は消滅した年月） */
  formerCorporateNumbers?: { number: string; until?: string; note?: string }[];
  /** 交代した前の代表者（until は交代した年月 YYYY-MM／YYYY。不明なら空） */
  formerRepresentatives?: { name: string; until?: string; note?: string }[];
  products?: string[];
  /** 事業概要（150〜250字）。description は一覧カード用の短い説明 */
  overview?: string;
  /** 事業転換などでヘルスケアとの関係が薄くなった会社の注記 */
  scopeNote?: string;
  /** 事業を終えた会社の記録（exit が「閉鎖」のとき）。date は終了した時期 YYYY-MM／YYYY */
  ended?: { date?: string; lastActiveAt?: string; successor?: string; note: string };
  /** 「活動停止」にする前の上場区分（活動が確認できたら戻す） */
  previousExit?: string;
  /** 事業の継続が確認できない会社の注記（厚生年金の全喪など） */
  statusNote?: string;
  employeesAsOf?: string;
  totalFunding?: string;
  highlight?: string;
  /** 証券コード（東証。JPX「東証上場銘柄一覧」より） */
  securitiesCode?: string;
  /** 東証33業種 */
  industry33?: string;
  /** 外形情報：公式サイト・プレスリリースから見た、どんな事業をいつから、何人の経営陣でやっているか */
  profile?: CompanyProfile;
  history?: { date: string; text: string; source?: string }[];
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

/** 事業・サービス。「事業開発のPubMed」として、始まり・経過・止まった理由を記録する */
export type Service = {
  id: string;
  name: string;
  company: string;
  companyId?: string;
  category: string;
  description: string;
  hp: string;
  startedYear: number | null;
  /** 提供中・終了・譲渡（他社へ）・統合（合併先で継続）・休止・不明 */
  status: '提供中' | '準備中' | '終了' | '譲渡' | '統合' | '休止' | '不明';
  /** 医療機器としての情報（PMDA の添付文書から）。無ければ承認・認証の記録が見つかっていない */
  device?: MedicalDevice;
  /** 準備中のときの段階（研究開発中・治験中・承認申請中・承認取得（発売前）・発売予定 など） */
  stage?: string;
  tags?: string[];
  startedAt?: string;
  endedAt?: string;
  successor?: string;
  milestones?: { date: string; text: string; source?: string }[];
  /** 止まった理由（END_REASONS のキー） */
  endReasons?: string[];
  endReasonNote?: string;
  lessons?: string;
  sources?: string[];
  updatedAt?: string;
  /** テーマ（歴代事業の調査単位）の slug */
  themes?: string[];
  /** 事業の種類（data/taxonomy.json の slug）。カテゴリ → 事業の種類 → 各社のサービス の真ん中 */
  type?: string;
  /** 名前を具体的なサービス名に差し替える前の名前 */
  formerName?: string;
  /** startedAt が何の日付か（正式提供開始・β版・発表・前身・前の運営会社で開始） */
  startBasis?: string;
  /** 開始時期が分からないとき、提供を確認できた最も古い時点（YYYY-MM）と出典 */
  knownSince?: string;
  knownSinceSource?: string;
  /** 自治体などに配る共通の仕組みのとき、導入先（自治体名・そこでのアプリ名・開始・出典） */
  adopters?: { name: string; app?: string; since?: string; source?: string }[];
};

/** 事業の種類（カテゴリの下の分け方）。scope "adjacent" はデジタルヘルスの周辺（製薬・卸・施設運営など） */
export type BizType = { slug: string; name: string; description: string; theme?: string; category: string; scope?: "adjacent" };

export type Theme = { slug: string; name: string; lead: string; articles?: string[] };

/** 企業同士の提携・出資・買収（提携マップ用） */
export type Partnership = {
  from: string;
  to: string;
  type: 'partnership' | 'investment' | 'parent';
  kind: string;
  label: string;
  area: string;
  date?: string;
  status: '継続' | '終了' | '不明';
  endedAt?: string;
  note?: string;
  sources?: string[];
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

/** 2021〜2023年の旧記事の題名。rewrittenAs は同じ題材で書き直した2026年版の記事の slug */
export type ArchiveArticle = { title: string; category: string; author: string; rewrittenAs?: string; note?: string; link?: string };

/** 企業の外形情報（公式サイトの事業内容・お知らせ、PR TIMES などのプレスリリースから） */
export type CompanyProfile = {
  /** 事業ごとの開始時期（YYYY または YYYY-MM） */
  businesses: { name: string; since?: string; note?: string; url?: string }[];
  /** 経営陣（取締役・執行役員など公式サイトや開示に載っている人）の人数 */
  management?: { count: number; note?: string; asOf?: string; members?: { name: string; role: string }[] };
  /** お知らせ・プレスリリースの一覧ページ */
  newsroom?: { site?: string; prtimes?: string; ir?: string };
  /** 直近の発信（お知らせ・リリース） */
  latestNews?: { date: string; title: string; url?: string };
  /** 発信の頻度の目安（直近1年のお知らせ・リリース数） */
  newsPerYear?: number;
  sources?: string[];
  checkedAt: string;
};

/** 決算の数字（百万円） */
/** 資金調達の1回分（金額は百万円。非公表は null） */
export type FundingRound = { date: string; round?: string; type: string; amount: number | null; investors?: string[]; lead?: string; source: string; note?: string };
/** 会社ごとの資金調達の記録（rounds は古い順。total は会社が発表した累計） */
export type Funding = { rounds: FundingRound[]; total?: { amount: number; asOf?: string; note?: string; source: string }; note?: string; checkedAt: string };
export type Figures = { revenue?: number; operatingIncome?: number; ordinaryIncome?: number; netIncome?: number };
/** 1回分の決算（決算短信のサマリーから） */
export type EarningsReport = {
  fiscalYear: string;
  quarter: 'FY' | 'Q1' | 'Q2' | 'Q3';
  label: string;
  date: string;
  title: string;
  consolidated?: boolean;
  current?: Figures;
  prior?: Figures;
  /** 四半期決算のときの当期通期予想 */
  forecast?: Figures;
  /** 通期決算のときの次期予想 */
  nextForecast?: Figures;
  /** セグメント別（百万円。四半期は累計） */
  segments?: Segment[];
  /** セグメント利益の呼び方（コア営業利益、事業利益など） */
  segmentProfitLabel?: string;
  pdf?: string;
  source?: string;
  note?: string;
};
/** 業績予想の修正（TDnet の XBRL。修正前と修正後の通期予想、百万円） */
export type ForecastRevision = { date: string; title: string; fiscalYear?: string; consolidated?: boolean; previous?: Figures; revised: Figures; pdf: string };
export type Segment = { name: string; revenue?: number; profit?: number; priorRevenue?: number; priorProfit?: number; healthcare?: boolean };
/** 適時開示（TDnet） */
export type Disclosure = { date: string; time: string; companyId: string; company: string; code: string; title: string; kind: string; pdf: string; xbrl?: string };

/** データの更新履歴（トップの「データの更新」と /updates/） */
export type UpdateEntry = { date: string; kind: string; title: string; body?: string; href?: string; links?: { label: string; href: string }[]; key?: string };

/** 医療機器としての情報。PMDA 医療機器の添付文書検索のページと最新の添付文書（PDF）の冒頭から */
export type MedicalDevice = {
  kind?: '承認' | '認証' | '届出';
  number?: string;
  regulatoryClass?: '一般医療機器' | '管理医療機器' | '高度管理医療機器';
  classLabel?: string;
  genericName?: string;
  jmdn?: string;
  category?: string;
  salesName?: string;
  maker?: string;
  approvedAt?: string;
  specialMaintenance?: boolean;
  pmdaUrl: string;
  insertUrl?: string;
  insertDate?: string;
  checkedAt?: string;
};

/** 投資家（資金調達の引受先をまとめたもの）。scripts/build-investors.mjs が data/investors.json に書く */
export type InvestorRound = { companyId: string; date: string; round?: string; type?: string; amount: number | null; lead: boolean; source?: string };
export type Investor = { id: string; name: string; type: string; aliases: string[]; companies: number; rounds: InvestorRound[] };
