import Link from 'next/link';
import {
  categoryName, fmtDate, getArchiveArticles, getArticles, getCategories, getCompanies, getFeaturedCompanies, getNews, getOverseas, getPeople, getServices,
  episodeHeadline, getMonthly, monthLabel, ytThumb, YT_SUBSCRIBE,
} from '@/lib/data';
import { withBase } from '@/lib/base';
import { SITE_NAME } from '@/lib/site';

const HOT = ['オンライン診療', '医療機関DX', 'PHR', 'フェムテック', '健康経営', 'メンタルヘルス', 'AI', '上場'];
const AXIS = {
  disease: { color: '#d4577b', note: '生活者・患者の課題から見る' },
  solution: { color: '#0e7c86', note: '「何で解くか」から見る' },
  domain: { color: '#123e7c', note: '既存産業の構造から見る' },
} as const;

const Ico = {
  co: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M8 8h3M8 12h3M8 16h3M3 21h18" /></svg>,
  sv: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 8 9-5 9 5-9 5zM3 13l9 5 9-5M3 17.5l9 5 9-5" /></svg>,
  pp: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" /></svg>,
  nw: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5" /></svg>,
};
const BigIcon = {
  co: (<svg viewBox="0 0 56 56" fill="none" className="icon" aria-hidden="true"><rect x="8" y="10" width="26" height="38" rx="3" stroke="#123e7c" strokeWidth="2.4" /><rect x="34" y="22" width="14" height="26" rx="3" stroke="#123e7c" strokeWidth="2.4" fill="#e3f3f4" /><path d="M15 18h4M23 18h4M15 26h4M23 26h4M15 34h4M23 34h4" stroke="#0e7c86" strokeWidth="2.4" strokeLinecap="round" /></svg>),
  sv: (<svg viewBox="0 0 56 56" fill="none" className="icon" aria-hidden="true"><path d="M8 20 28 10l20 10-20 10z" fill="#e3f3f4" stroke="#123e7c" strokeWidth="2.4" strokeLinejoin="round" /><path d="m8 29 20 10 20-10M8 37l20 10 20-10" stroke="#0e7c86" strokeWidth="2.4" strokeLinejoin="round" /></svg>),
  pp: (<svg viewBox="0 0 56 56" fill="none" className="icon" aria-hidden="true"><circle cx="22" cy="20" r="8" stroke="#123e7c" strokeWidth="2.4" fill="#e3f3f4" /><path d="M8 46a14 14 0 0 1 28 0" stroke="#123e7c" strokeWidth="2.4" /><circle cx="39" cy="22" r="6" stroke="#0e7c86" strokeWidth="2.4" /><path d="M36 34a11 11 0 0 1 13 12" stroke="#0e7c86" strokeWidth="2.4" /></svg>),
};
const initialOf = (name: string) => name.replace(/^(株式会社|有限会社|合同会社)\s*/, '').replace(/\s*株式会社$/, '').trim().slice(0, 1).toUpperCase();

export default function Home() {
  const articles = getArticles();
  const feature = articles.find((a) => a.featured) ?? articles[0];
  const promo = articles.find((a) => a.slug.startsWith('ai-medical-devices'));
  const companies = getCompanies();
  const services = getServices();
  const people = getPeople();
  const news = getNews();
  const cats = getCategories();
  const episodes = getMonthly();
  const latest = episodes[0];
  const featured = getFeaturedCompanies().slice(0, 6);
  // 今回の更新で新しく収録した会社のうち、注目理由（資金調達・承認など）が書けたものを創業の新しい順に
  const fresh = companies
    .filter((c) => c.source.startsWith('Healthtech DB 編集部調べ') && c.highlight && (c.foundedYear ?? 0) >= 2018)
    .sort((a, b) => (b.foundedYear ?? 0) - (a.foundedYear ?? 0) || a.name.localeCompare(b.name, 'ja'))
    .slice(0, 6);
  const freshTotal = companies.filter((c) => c.source.startsWith('Healthtech DB 編集部調べ')).length;
  const listed = companies.filter((c) => c.exit === '上場').length;
  const catStats = cats
    .map((c) => {
      const list = companies.filter((x) => x.categories.includes(c.slug));
      return { c, n: list.length, listed: list.filter((x) => x.exit === '上場').length, recent: list.filter((x) => (x.foundedYear ?? 0) >= 2015).length };
    })
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const maxN = catStats[0]?.n ?? 1;
  const archive = getArchiveArticles();
  const gridItems = [
    ...articles.map((a) => ({ key: a.slug, href: `/articles/${a.slug}/`, title: a.title, tags: [categoryName(a.category), ...(a.tags ?? []).slice(0, 1)], date: `${fmtDate(a.date)} 更新`, navy: true, thumb: categoryName(a.category) })),
    ...archive.slice(0, 6 - articles.length).map((a, i) => ({ key: `ar${i}`, href: '/articles/archive/', title: a.title, tags: [a.category, '本文復元中'], date: '2021〜2023 公開', navy: false, thumb: a.category })),
  ];

  return (
    <div className="home">
      {/* ---------- ヒーロー: 検索中心 ---------- */}
      <section className="hx bleed">
        <div className="container hx-grid">
          <div>
            <span className="eyebrow2">HEALTHTECH DATABASE</span>
            <h1>ヘルスケアビジネスを、<br /><span>データで見渡す。</span></h1>
            <p className="lead">国内ヘルステック企業の事業・サービス・人物・ニュースを、疾患／ソリューション／事業領域の3軸でつなげたデータベースです。</p>
            <form className="hero-search" action={withBase('/search/')} method="get" role="search">
              <input type="search" name="q" placeholder="企業名・サービス名・人物・カテゴリで探す" aria-label="キーワード" />
              <button type="submit">検索</button>
            </form>
            <div className="hot">
              <span>よく調べられているキーワード</span>
              {HOT.map((k) => <Link key={k} href={`/search/?q=${encodeURIComponent(k)}`}>{k}</Link>)}
            </div>
          </div>
          <div className="stat4">
            <Link href="/companies/"><span className="l">{Ico.co}国内企業</span><span className="v">{companies.length}<small>社</small></span><span className="go">企業データベース →</span></Link>
            <Link href="/services/"><span className="l">{Ico.sv}サービス・海外</span><span className="v">{services.length + getOverseas().length}<small>件</small></span><span className="go">サービスデータベース →</span></Link>
            <Link href="/talents/"><span className="l">{Ico.pp}人物</span><span className="v">{people.length}<small>名</small></span><span className="go">人物データベース →</span></Link>
            <Link href="/news/"><span className="l">{Ico.nw}ニュース</span><span className="v">{news.length}<small>本</small></span><span className="go">毎朝更新 →</span></Link>
          </div>
        </div>
      </section>

      {/* ---------- 編集部の注目 ---------- */}
      <section className="band bleed">
        <div className="container">
          <div className="sec-title"><h2>編集部の注目</h2><Link href="/articles/" className="more arrow">記事一覧</Link></div>
          <div className="pick">
            {feature && (
              <article className="feature-card">
                <Link href={`/articles/${feature.slug}/`} className="feature-art" aria-label={feature.title} style={{ textDecoration: 'none' }}>
                  <div className="big">{cats.length}<small>カテゴリ</small></div>
                  <div className="cap">疾患・ソリューション・事業領域の3軸で分類</div>
                </Link>
                <div className="feature-body">
                  <div className="eyebrow"><b>特集</b><span className="sep" /><span>{categoryName(feature.category)}</span></div>
                  <h2><Link href={`/articles/${feature.slug}/`}>{feature.title.split(' ── ')[0]}</Link></h2>
                  <p>{feature.summary}</p>
                  <div className="feature-foot"><span>{fmtDate(feature.date)} 更新</span><Link href={`/articles/${feature.slug}/`} className="arrow">記事を読む</Link></div>
                </div>
              </article>
            )}
            {promo && (
              <Link href={`/articles/${promo.slug}/`} className="promo2">
                <span className="t1">DATA FEATURE</span>
                <span className="t2">国内のAI医療機器<br />承認一覧</span>
                <span className="t3">EndoBRAIN から nodoca まで、製造販売承認を取得した23件を承認日・モダリティ別に整理しました。</span>
                <span className="t4">一覧を見る →</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ---------- データベースの入口 ---------- */}
      <section className="band gray bleed">
        <div className="container">
          <div className="sec-title"><h2>データベースを使う</h2><span className="small muted">出典: 各社Webサイト・プレスリリース、国税庁 法人番号公表サイト</span></div>
          <div className="db3">
            <div className="data-card">
              {BigIcon.co}
              <h3>企業データベース</h3>
              <div className="big">{companies.length}<small>社</small><span>うち上場 {listed} 社</span></div>
              <p>カテゴリ・所在地・創業年・上場区分で国内のヘルスケア企業を絞り込めます。</p>
              <div className="idx">事業概要・創業者・代表者・親会社・法人番号・関連ニュース</div>
              <Link href="/companies/" className="go arrow">企業を探す</Link>
            </div>
            <div className="data-card">
              {BigIcon.sv}
              <h3>サービス・海外企業</h3>
              <div className="big">{services.length + getOverseas().length}<small>件</small><span>サービス {services.length}・海外 {getOverseas().length}</span></div>
              <p>国内企業が提供するサービスと、米国・欧州・アジアの注目企業をまとめています。</p>
              <div className="idx">開始年・提供企業・カテゴリ・事業領域</div>
              <Link href="/services/" className="go arrow">サービスを探す</Link>
            </div>
            <div className="data-card">
              {BigIcon.pp}
              <h3>人物データベース</h3>
              <div className="big">{people.length}<small>名</small><span>創業者・代表者</span></div>
              <p>ヘルステック企業の創業者・代表者から、関わっている企業をたどれます。</p>
              <div className="idx">所属企業・役職（複数社の兼任も表示）</div>
              <Link href="/talents/" className="go arrow">人物を探す</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 注目企業 ---------- */}
      <section className="band bleed">
        <div className="container">
          <div className="sec-title"><h2>注目のヘルステック企業</h2><Link href="/companies/" className="more arrow">企業一覧を見る</Link></div>
          <div className="co-grid">
            {featured.map((c) => (
              <Link key={c.id} href={`/companies/${c.id}/`} className="co">
                <span className="av">{initialOf(c.name)}</span>
                <span>
                  <span className="ct" style={{ display: 'block' }}>{categoryName(c.categories[0] ?? '')}</span>
                  <span className="nm" style={{ display: 'block' }}>{c.name}</span>
                  <span className="ds" style={{ display: '-webkit-box' }}>{c.description}</span>
                  <span className="mt" style={{ display: 'block' }}>{c.prefecture}・{c.foundedYear}年創業・{c.exit}</span>
                </span>
              </Link>
            ))}
          </div>
          {fresh.length > 0 && (
            <>
              <div className="sec-title" style={{ marginTop: 44 }}><h2>新しく収録した企業<small className="sec-sub">今回の更新で {freshTotal} 社を追加</small></h2><Link href="/companies/" className="more arrow">追加した企業をすべて見る</Link></div>
              <div className="co-grid">
                {fresh.map((c) => (
                  <Link key={c.id} href={`/companies/${c.id}/`} className="co">
                    <span className="av new">{initialOf(c.name)}</span>
                    <span>
                      <span className="ct" style={{ display: 'block' }}>{categoryName(c.categories[0] ?? '')}・{c.foundedYear}年創業</span>
                      <span className="nm" style={{ display: 'block' }}>{c.name}</span>
                      <span className="ds" style={{ display: '-webkit-box' }}>{c.description}</span>
                      <span className="mt hl" style={{ display: 'block' }}>{c.highlight}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ---------- 新着ニュース ＋ カテゴリ別企業数 ---------- */}
      <section className="band gray bleed">
        <div className="container duo">
          <div className="box">
            <h2>新着ニュース</h2>
            {news.slice(0, 6).map((n, i) => (
              <div className="rank" key={n.id}>
                <span className="n">{i + 1}</span>
                <div>
                  <a href={n.url} target="_blank" rel="noreferrer" className="ttl">{n.title}</a>
                  <div className="sub">
                    {n.companyId ? <Link href={`/companies/${n.companyId}/`}>{n.company}</Link> : <span>{n.company}</span>}
                    {n.category && <span>{categoryName(n.category)}</span>}
                    <span>{fmtDate(n.publishedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="foot">PR TIMES のヘルスケア関連リリースを毎朝収集<br /><Link href="/news/" className="arrow">すべてのニュースを見る</Link></div>
          </div>
          <div className="box">
            <h2>カテゴリ別 企業数</h2>
            <div className="tbl-cap">収録企業数の上位10カテゴリ（1社が複数カテゴリに属する場合あり）</div>
            <table className="mtable">
              <thead><tr><th>カテゴリ</th><th>企業数</th><th>上場</th><th>2015年以降創業</th></tr></thead>
              <tbody>
                {catStats.slice(0, 10).map(({ c, n, listed: l, recent }) => (
                  <tr key={c.slug}>
                    <td><span className="name"><Link href={`/categories/${c.slug}/`}>{c.name}</Link></span><div className="bar"><i style={{ width: `${(n / maxN) * 100}%` }} /></div></td>
                    <td className="num">{n}<small>社</small></td>
                    <td className="num">{l}<small>社</small></td>
                    <td className={`num ${recent / n >= 0.5 ? 'up' : ''}`}>{Math.round((recent / n) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="foot">出典: {SITE_NAME} 企業データベース<br /><Link href="/categories/" className="arrow">カテゴリ一覧を見る</Link></div>
          </div>
        </div>
      </section>

      {/* ---------- 月刊ヘルステック（YouTube） ---------- */}
      {latest && (
        <section className="band wave bleed" style={{ padding: '72px 0' }}>
          <div className="container mr">
            <div>
              <span className="k">YOUTUBE LIVE</span>
              <h2>#月刊ヘルステック</h2>
              <p>1か月分のヘルステックニュースを、医師の加藤浩晃と、ヘルスケア新規事業を支援する有村琢磨がライブで読み解く番組です。資金調達・提携・薬事承認・制度改定のなかから事業に効く話題を選び、「なぜ今それが起きたのか」「次に何が動くのか」まで話します。</p>
              <div className="chips3">
                <span>配信<b>毎月1回</b></span>
                <span>場所<b>医療ビジネスチャンネル</b></span>
                <span>アーカイブ<b>全{episodes.length}回</b></span>
              </div>
              <a href={latest.url} target="_blank" rel="noreferrer" className="btn-w">最新回を見る ▶</a>
              <a href={YT_SUBSCRIBE} target="_blank" rel="noreferrer" className="btn-wo">チャンネル登録</a>
            </div>
            <div>
              <a href={latest.url} target="_blank" rel="noreferrer" className="yt-latest">
                <span className="th"><img src={ytThumb(latest.videoId, 'mq')} alt="" loading="lazy" /><i aria-hidden="true" /></span>
                <span className="cap"><b>最新回 {monthLabel(latest.month)}</b>{episodeHeadline(latest)}</span>
              </a>
              <ol className="timeline">
                {episodes.slice(1, 5).map((e) => (
                  <li key={e.videoId}>
                    <div className="d"><b>{monthLabel(e.month)}</b></div>
                    <a className="t" href={e.url} target="_blank" rel="noreferrer">{episodeHeadline(e)}</a>
                  </li>
                ))}
              </ol>
              <Link href="/monthly/" className="mr-more">すべての回を見る →</Link>
            </div>
          </div>
        </section>
      )}

      {/* ---------- 3軸から探す ---------- */}
      <section className="band bleed">
        <div className="container">
          <div className="sec-title"><h2>3つの軸から探す</h2><Link href="/categories/" className="more arrow">カテゴリ一覧</Link></div>
          <div className="axes">
            {(['disease', 'solution', 'domain'] as const).map((g) => {
              const list = catStats.filter(({ c }) => c.group === g);
              return (
                <div className="axis" key={g} style={{ ['--ax' as string]: AXIS[g].color }}>
                  <h3>{cats.find((c) => c.group === g)?.groupLabel}<small>{list.length}カテゴリ</small></h3>
                  <p>{AXIS[g].note}</p>
                  {list.slice(0, 7).map(({ c, n }) => (
                    <Link key={c.slug} href={`/categories/${c.slug}/`} style={{ ['--w' as string]: `${(n / maxN) * 100}%` }}>
                      {c.name}<span>{n}社</span><i />
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- 記事 ---------- */}
      <section className="band gray bleed">
        <div className="container">
          <div className="sec-title"><h2>新着記事・アーカイブ</h2></div>
          <div className="agrid">
            {gridItems.map((g) => (
              <Link key={g.key} href={g.href} className="acard">
                <div className={`thumb ${g.navy ? 'navy' : ''}`}>{g.thumb}</div>
                <div className="tags">{g.tags.map((t) => <span key={t}>{t}</span>)}</div>
                <h3>{g.title}</h3>
                <div className="date">{g.date}</div>
              </Link>
            ))}
          </div>
          <div className="center"><Link href="/articles/" className="btn-outline arrow">すべての記事を見る（全{articles.length + archive.length}本）</Link></div>
        </div>
      </section>
    </div>
  );
}
