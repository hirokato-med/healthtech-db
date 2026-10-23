import Link from 'next/link';
import { NEWSLETTER_URL } from '@/components/Footer';
import {
  categoryName, fmtDate, getArchiveArticles, getArticles, getCategories, getCompanies, getFeaturedCompanies, getNews, getOverseas, getPeople, getServices, getWebinars,
} from '@/lib/data';
import { SITE_NAME, SITE_SUB, SITE_TAGLINE } from '@/lib/site';

const I = {
  building: (<svg viewBox="0 0 56 56" fill="none" className="icon" aria-hidden="true"><rect x="8" y="10" width="26" height="38" rx="2" stroke="#1f2430" strokeWidth="2.4" /><rect x="34" y="22" width="14" height="26" rx="2" stroke="#1f2430" strokeWidth="2.4" fill="#e8f4ee" /><path d="M15 18h4M23 18h4M15 26h4M23 26h4M15 34h4M23 34h4" stroke="#1e8a4c" strokeWidth="2.4" strokeLinecap="round" /><circle cx="44" cy="44" r="9" fill="#fff" stroke="#1f2430" strokeWidth="2.4" /><path d="M40 47v-3M44 47v-6M48 47v-4" stroke="#1f2430" strokeWidth="2" strokeLinecap="round" /></svg>),
  layers: (<svg viewBox="0 0 56 56" fill="none" className="icon" aria-hidden="true"><path d="M8 20 28 10l20 10-20 10z" fill="#f6c445" stroke="#1f2430" strokeWidth="2.4" strokeLinejoin="round" /><path d="m8 29 20 10 20-10M8 37l20 10 20-10" stroke="#1f2430" strokeWidth="2.4" strokeLinejoin="round" /><circle cx="44" cy="44" r="9" fill="#fff" stroke="#1f2430" strokeWidth="2.4" /><path d="M40 47v-3M44 47v-6M48 47v-4" stroke="#1f2430" strokeWidth="2" strokeLinecap="round" /></svg>),
  doc: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3h9l4 4v14H6z M9 11h7M9 15h7M9 7h3" /></svg>),
  users: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" /></svg>),
  mic: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="13" rx="2" /><path d="m10 9 5 2.5-5 2.5z" /></svg>),
  mail: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>),
};

export default function Home() {
  const articles = getArticles();
  const feature = articles.find((a) => a.featured) ?? articles[0];
  const promo = articles.find((a) => a.slug.startsWith('ai-medical-devices'));
  const companies = getCompanies();
  const services = getServices();
  const news = getNews();
  const cats = getCategories();
  const webinars = getWebinars();
  const lastW = webinars.at(-1);
  const prevW = webinars.slice(-3, -1).reverse();
  const featured = getFeaturedCompanies().slice(0, 5);
  const listed = companies.filter((c) => c.exit === '上場').length;

  const catStats = cats
    .map((c) => {
      const list = companies.filter((x) => x.categories.includes(c.slug));
      return { c, n: list.length, listed: list.filter((x) => x.exit === '上場').length, recent: list.filter((x) => (x.foundedYear ?? 0) >= 2015).length };
    })
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const maxN = catStats[0]?.n ?? 1;
  const topCats = catStats.slice(0, 4);
  const otherCats = catStats.slice(4);
  const archive = getArchiveArticles();
  const gridItems = [
    ...articles.map((a) => ({ key: a.slug, href: `/articles/${a.slug}/`, title: a.title, tags: [categoryName(a.category), ...(a.tags ?? []).slice(0, 1)], date: fmtDate(a.date), navy: Boolean(a.featured), thumb: categoryName(a.category) })),
    ...archive.slice(0, 8 - articles.length).map((a, i) => ({ key: `ar${i}`, href: '/articles/archive/', title: a.title, tags: [a.category, '復元中'], date: '2021〜2023', navy: false, thumb: a.category })),
  ];

  return (
    <div className="home">
      {/* ---------- ヒーロー ---------- */}
      <section className="hero-band bleed">
        <div className="container">
          <div className="hero-title">
            <h1>{SITE_TAGLINE}</h1>
            <p>{SITE_SUB}</p>
          </div>
          <div className="hero-grid">
            <div>
              {feature && (
                <article className="feature-card">
                  <Link href={`/articles/${feature.slug}/`} className="feature-art" aria-label={feature.title} style={{ textDecoration: 'none' }}>
                    <div className="big">{companies.length}<small>社</small></div>
                    <div className="cap">国内ヘルスケア企業を3軸・{cats.length}カテゴリで分類</div>
                  </Link>
                  <div className="feature-body">
                    <div className="eyebrow"><b>編集部の注目</b><span className="sep" /><span>{categoryName(feature.category)}</span></div>
                    <h2><Link href={`/articles/${feature.slug}/`}>{feature.title.split(' ── ')[0]}</Link></h2>
                    <p>{feature.summary}</p>
                    <div className="feature-foot">
                      <span>{fmtDate(feature.date)} 更新</span>
                      <Link href={`/articles/${feature.slug}/`} className="arrow">記事を読む</Link>
                    </div>
                  </div>
                </article>
              )}
              <div className="data-head">
                <div><b>各社公表情報と法人番号をもとにした企業データ</b>　<span>会員登録不要・無料</span></div>
                <span className="src">出典: 各社Webサイト・プレスリリース、国税庁 法人番号公表サイト</span>
              </div>
              <div className="data-cards">
                <div className="data-card">
                  {I.building}
                  <h3>ヘルスケア企業 データベース</h3>
                  <div className="big">{companies.length}<small>社</small><span>を収録（うち上場 {listed} 社）</span></div>
                  <p>事業カテゴリ・所在地・創業年・上場区分で、国内のヘルスケア企業を絞り込めます。</p>
                  <div className="idx">主な項目：事業概要・創業者・代表者・親会社・法人番号・関連ニュース</div>
                  <Link href="/companies/" className="go arrow">データを見る</Link>
                </div>
                <div className="data-card">
                  {I.layers}
                  <h3>サービス・海外企業 データベース</h3>
                  <div className="big">{services.length + getOverseas().length}<small>件</small><span>サービス {services.length}・海外 {getOverseas().length}</span></div>
                  <p>国内企業が提供するサービスと、米国・欧州・アジアの注目ヘルステック企業をまとめています。</p>
                  <div className="idx">主な項目：開始年・提供企業・カテゴリ・事業領域</div>
                  <Link href="/services/" className="go arrow">データを見る</Link>
                </div>
              </div>
            </div>
            <aside>
              {promo && (
                <Link href={`/articles/${promo.slug}/`} className="promo" style={{ display: 'block', textDecoration: 'none' }}>
                  <div className="promo-in">
                    <div className="top"><span>新規事業の前に</span><span className="tagfree">無料特集</span></div>
                    <div className="head"><em>AI医療機器</em><br />承認一覧</div>
                    <div className="sub">国内で製造販売承認を取得した23件を、承認日順に整理</div>
                    <div className="go"><b>無料で読む ›</b></div>
                  </div>
                </Link>
              )}
              <div className="achieve">
                <h3>{SITE_NAME} の実績</h3>
                <div className="item2"><div className="lab">{I.doc}ヘルスケアビジネスの解説記事</div><div className="val">{articles.length + archive.length}<small>本</small></div></div>
                <div className="item2"><div className="lab">{I.users}人物データ（創業者・代表者）</div><div className="val">{getPeople().length}<small>名</small></div></div>
                <div className="item2"><div className="lab">{I.mic}マンスリーレビュー</div><div className="val orange">{lastW?.vol ?? 17}<small>回開催</small><Link href="/webinars/">開催履歴</Link></div></div>
                <div className="item2"><div className="lab">{I.mail}メルマガ</div><div className="val">毎朝<small>配信</small></div></div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ---------- 注目企業（セミナー枠の置き換え） ---------- */}
      <section className="band gray bleed">
        <div className="container">
          <div className="sec-title"><h2>注目のヘルステック企業</h2><Link href="/companies/" className="more arrow">企業一覧を見る</Link></div>
          <div className="banners">
            {featured.map((c, i) => (
              <Link key={c.id} href={`/companies/${c.id}/`} className={`bn ${['', 'v2', 'v3', 'v4', ''][i]}`}>
                {i === 0 && <span className="pill">注目</span>}
                <span className="stamp">{categoryName(c.categories[0] ?? '')}</span>
                <span className="k" style={{ marginTop: i === 0 ? 30 : 34 }}>{c.prefecture}・{c.foundedYear}年創業</span>
                <span className="t">{c.name}</span>
                <span className="d">{c.description}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 新着ニュース ＋ カテゴリ別企業数 ---------- */}
      <section className="band bleed">
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
            <div className="foot">出典: {SITE_NAME} 企業データベース（2021年9月時点の投入データを基礎に更新）<br /><Link href="/categories/" className="arrow">カテゴリ一覧を見る</Link></div>
          </div>
        </div>
      </section>

      {/* ---------- マンスリーレビュー（紺黒の帯） ---------- */}
      <section className="band dark bleed" style={{ padding: '80px 0' }}>
        <div className="container nl">
          <div>
            <div className="kick">ヘルスケア業界の月例ウェビナー</div>
            <h2>Healthtech DB<br />マンスリーレビュー</h2>
            <div className="catch">今月のニュースを、<br />専門家2人が読み解く。</div>
            <p className="lead">医療機器・デジタルヘルス・製薬・政策など、その月のヘルスケアビジネスの動きから注目のニュースを選び、背景と事業への影響をランチタイムの45分で解説します。</p>
            <div className="facts">
              <div>開催<b>毎月・正午</b></div>
              <div>参加費<b>無料</b></div>
              <div>開催実績<b>第{lastW?.vol ?? 17}回まで</b></div>
            </div>
            <div className="btns">
              <a href={NEWSLETTER_URL} target="_blank" rel="noreferrer" className="btn-orange arrow">再開のお知らせを受け取る</a>
              <Link href="/webinars/" className="btn-ghost-w">開催履歴を見る</Link>
            </div>
            <div className="note">メルマガ（無料）で再開のご案内をお送りします。いつでも配信停止できます。</div>
          </div>
          <div>
            {lastW && (
              <div className="issue">
                <div className="ihead"><b>Monthly Review</b><span><strong>第{lastW.vol}回</strong>{lastW.date}（金）正午</span></div>
                <div className="latest">最終回<em>アーカイブ</em></div>
                <h3>{lastW.title.replace(/^Healthtech DB マンスリーレビュー vol\.\d+/, '').replace(/[（）()]/g, '') || '2023年5月のヘルスケアニュース'}をおさらい</h3>
                <p>その月に発表された資金調達・提携・薬事承認・制度改定から、ヘルスケアビジネスに影響の大きいニュースを選んで解説しました。</p>
                <dl>
                  <div><dt>登壇</dt><dd>加藤浩晃（医師・アイリス共同創業者）ほか</dd></div>
                  <div><dt>形式</dt><dd>Zoom ウェビナー・45分<small>{lastW.note ?? ''}</small></dd></div>
                </dl>
                <Link href="/webinars/" className="read arrow">この回の詳細</Link>
              </div>
            )}
            <div className="back-issues">
              {prevW.map((w) => (
                <Link key={w.date} href="/webinars/"><span><b>第{w.vol}回</b>{w.date}</span>{w.title.replace(/^Healthtech DB マンスリーレビュー vol\.\d+/, '').replace(/[（）()]/g, '')}</Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- カテゴリから探す ---------- */}
      <section className="band gray bleed">
        <div className="container">
          <div className="sec-title"><h2>カテゴリから探す</h2><Link href="/categories/" className="more arrow">カテゴリ一覧</Link></div>
          <div className="cat-cards">
            {topCats.map(({ c, n }) => (
              <Link key={c.slug} href={`/categories/${c.slug}/`} className="cat-card">
                <div className="thumb">{c.name}</div>
                <div className="row2"><b>{c.name}</b><span>{n}社</span></div>
              </Link>
            ))}
          </div>
          <div className="themes-h">そのほかのカテゴリ</div>
          <div className="themes">
            {otherCats.map(({ c, n }) => (
              <Link key={c.slug} href={`/categories/${c.slug}/`}>{c.name}<span>{n}</span></Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 最新の記事 ---------- */}
      <section className="band bleed">
        <div className="container">
          <div className="sec-title"><h2>最新の記事</h2></div>
          <div className="agrid">
            {gridItems.map((g) => (
              <Link key={g.key} href={g.href} className="acard">
                <div className={`thumb ${g.navy ? 'navy' : ''}`}>{g.thumb}</div>
                <div className="tags">{g.tags.map((t) => <span key={t}>{t}</span>)}</div>
                <h3>{g.title}</h3>
                <div className="date">{g.date} 更新</div>
              </Link>
            ))}
          </div>
          <div className="center"><Link href="/articles/" className="btn-outline arrow">すべての記事を見る（全{articles.length + archive.length}本）</Link></div>
        </div>
      </section>
    </div>
  );
}
