import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Chips } from '@/components/Chip';
import { CompanyCard } from '@/components/CompanyCard';
import { NewsList } from '@/components/NewsList';
import { CORRECTION_FORM_URL } from '@/components/Footer';
import { categoryName, findCompanyByName, getArticles, getCompanies, getCompany, getDisclosures, getEarnings, newsOf, peopleOf, servicesOf } from '@/lib/data';
import { forecastLabel, forecastOf, money, pct, yoy } from '@/lib/earnings';

export function generateStaticParams() {
  return getCompanies().map((c) => ({ id: c.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const c = getCompany((await params).id);
  return { title: c?.name ?? '企業', description: c?.description || `${c?.name} の企業情報・提供サービス・関連ニュース` };
}

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getCompany(id);
  if (!c) notFound();
  const services = servicesOf(c.id);
  const people = peopleOf(c.id);
  const news = newsOf(c).slice(0, 10);
  const reports = getEarnings()[c.id] ?? [];
  const discl = c.securitiesCode ? getDisclosures().filter((d) => d.companyId === c.id).slice(0, 8) : [];
  const related = getCompanies().filter((x) => x.id !== c.id && x.categories.some((s) => c.categories.includes(s))).slice(0, 6);
  const empAsOf = c.employeesAsOf ? c.employeesAsOf.replace(/^(\d{4})-(\d{2})$/, (_, y, m) => `${y}年${Number(m)}月`) : c.source.includes('2021-09') ? '2021年' : '';
  const srcLabel = (u: string) => {
    const corp = u.match(/houjin-bangou\.nta\.go\.jp.*selHouzinNo=(\d{13})/)?.[1];
    if (corp) return `国税庁 法人番号公表サイト（${corp}）`;
    if (u.includes('nenkin.go.jp/do/search_section')) return '日本年金機構 適用事業所検索';
    return u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 48);
  };
  const ym = (s: string) => s.replace(/^(\d{4})-(\d{2})$/, (_, y, m) => `${y}年${Number(m)}月`).replace(/^(\d{4})$/, '$1年');
  const personLink = (n: string) => { const p = people.find((x) => x.name === n); return p ? <Link href={`/talents/${p.id}/`}>{n}</Link> : n; };
  const articles = getArticles().filter((a) => a.companies?.some((n) => findCompanyByName(n)?.id === c.id));

  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず">
        <Link href="/">トップ</Link> / <Link href="/companies/">企業</Link> / <span>{c.name}</span>
      </nav>
      <div className="page-head">
        <div className="kicker">Company</div>
        <h1>{c.name}</h1>
        <div style={{ marginTop: 10 }}>
          <Chips slugs={c.categories} />
        </div>
        {c.description && <p className="lead">{c.description}</p>}
        {c.highlight && <p className="co-highlight"><b>注目</b>{c.highlight}</p>}
        {c.scopeNote && <p className="co-scope"><b>現在の事業</b>{c.scopeNote}</p>}
        {c.ended && <p className="co-scope ended"><b>{c.exit === '対象外' ? '掲載対象外' : c.exit === '活動停止' ? '活動停止（確認できず）' : '事業終了'}{c.ended.date ? `（${ym(c.ended.date)}）` : ''}</b>{c.ended.note}{c.ended.lastActiveAt ? ` 最後に確認できた活動は${ym(c.ended.lastActiveAt)}。` : ''}{c.ended.successor ? ` 事業の引き継ぎ先: ${c.ended.successor}。` : ''}</p>}
        {!c.ended && c.statusNote && <p className="co-scope warn"><b>現状</b>{c.statusNote}</p>}
      </div>

      <div className="two-col">
        <div style={{ display: 'grid', gap: 20 }}>
          {c.overview && (
            <section className="panel">
              <h3>事業概要</h3>
              <p className="co-overview">{c.overview}</p>
            </section>
          )}
          {c.profile && (
            <section className="panel">
              <h3>外形情報</h3>
              {c.profile.businesses.length > 0 && (
                <table className="profile-table">
                  <thead><tr><th>事業</th><th>開始</th><th>年数</th></tr></thead>
                  <tbody>
                    {c.profile.businesses.map((b) => (
                      <tr key={b.name}>
                        <td>{b.url ? <a href={b.url} target="_blank" rel="noreferrer">{b.name}</a> : b.name}{b.note && <small>{b.note}</small>}</td>
                        <td className="nw">{b.since ? ym(b.since) : '—'}</td>
                        <td className="nw">{b.since ? `${Math.max(0, Number(c.profile!.checkedAt.slice(0, 4)) - Number(b.since.slice(0, 4)))}年` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <dl className="kv profile-kv">
                {c.profile.management && (
                  <><dt>経営陣</dt><dd><b>{c.profile.management.count}名</b>{c.profile.management.note ? `（${c.profile.management.note}）` : ''}{c.profile.management.asOf ? <span className="muted small"> {ym(c.profile.management.asOf)}時点</span> : null}</dd></>
                )}
                {(c.profile.newsroom?.site || c.profile.newsroom?.prtimes || c.profile.newsroom?.ir) && (
                  <><dt>発信</dt><dd className="profile-links">
                    {c.profile.newsroom?.site && <a href={c.profile.newsroom.site} target="_blank" rel="noreferrer">公式サイトのお知らせ</a>}
                    {c.profile.newsroom?.prtimes && <a href={c.profile.newsroom.prtimes} target="_blank" rel="noreferrer">PR TIMES</a>}
                    {c.profile.newsroom?.ir && <a href={c.profile.newsroom.ir} target="_blank" rel="noreferrer">IR・適時開示</a>}
                  </dd></>
                )}
                {c.profile.latestNews && (
                  <><dt>直近の発信</dt><dd>{ym(c.profile.latestNews.date)}　{c.profile.latestNews.url ? <a href={c.profile.latestNews.url} target="_blank" rel="noreferrer">{c.profile.latestNews.title}</a> : c.profile.latestNews.title}{c.profile.newsPerYear != null && <span className="muted small">（直近1年の発信 {c.profile.newsPerYear}件）</span>}</dd></>
                )}
              </dl>
              <p className="muted small" style={{ marginTop: 8 }}>公式サイトの事業内容・お知らせとプレスリリースから編集部がまとめました（{ym(c.profile.checkedAt)}確認）。</p>
            </section>
          )}

          {c.securitiesCode && (
            <section className="panel">
              <h3>決算<small className="muted" style={{ marginLeft: 8, fontWeight: 400 }}>{c.listedMarket}・{c.securitiesCode}</small></h3>
              {reports.length ? (
                <div className="earn-wrap">
                  <table className="earn-table compact">
                    <thead><tr><th>決算期</th><th>売上高</th><th>前年比</th><th>営業利益</th><th>純利益</th><th>会社予想（売上高／営業利益）</th></tr></thead>
                    <tbody>
                      {reports.map((r) => {
                        const g = yoy(r.current?.revenue, r.prior?.revenue), f = forecastOf(r);
                        return (
                          <tr key={r.date + r.label}>
                            <td className="nw">{r.pdf ? <a href={r.pdf} target="_blank" rel="noreferrer">{r.label.replace(/（中間期）/, '')}</a> : r.label}<small>{r.date.replace(/-/g, '/')} 発表</small></td>
                            <td className="num">{money(r.current?.revenue)}</td>
                            <td className={`num ${g == null ? '' : g >= 0 ? 'up' : 'down'}`}>{pct(g)}</td>
                            <td className={`num ${(r.current?.operatingIncome ?? 0) < 0 ? 'down' : ''}`}>{money(r.current?.operatingIncome)}</td>
                            <td className={`num ${(r.current?.netIncome ?? 0) < 0 ? 'down' : ''}`}>{money(r.current?.netIncome)}</td>
                            <td className="num fc">{f ? <>{money(f.revenue)}／{money(f.operatingIncome)}<small>{forecastLabel(r)}</small></> : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted small">決算の数字は集計中です（次の決算発表から自動で入ります）。</p>
              )}
              {discl.length > 0 && (
                <>
                  <h4 className="sub-h">適時開示</h4>
                  <ul className="disc-list compact">
                    {discl.map((d) => (
                      <li key={d.pdf}><span className="d">{d.date.replace(/-/g, '/')}</span><span className={`badge k-${d.kind}`}>{d.kind}</span><a href={d.pdf} target="_blank" rel="noreferrer" className="t">{d.title}</a></li>
                    ))}
                  </ul>
                </>
              )}
              <p className="muted small" style={{ marginTop: 8 }}><Link href="/earnings/" className="arrow">上場ヘルスケア企業の決算一覧</Link></p>
            </section>
          )}

          <section className="panel">
            <h3>事業・サービス</h3>
            {services.length ? (
              <div className="grid">
                {services.map((s) => (
                  <article className="card" key={s.id}>
                    <Link href={`/services/${s.id}/`} className="title">{s.name}</Link>
                    <div className="chips"><Link href={`/categories/${s.category}/`} className="chip">{categoryName(s.category)}</Link></div>
                    <p className="desc">{s.description}</p>
                    <div className="meta">{(s.startedAt || s.startedYear) && <span>{(s.startedAt ?? String(s.startedYear)).slice(0, 4)}年開始</span>}{s.endedAt && <span>{s.endedAt.slice(0, 4)}年{s.status === '提供中' ? '' : s.status}</span>}<span className={`badge st-${s.status}`}>{s.status}</span></div>
                  </article>
                ))}
              </div>
            ) : c.products?.length ? (
              <div className="chips">{c.products.map((n) => <span key={n} className="chip">{n}</span>)}</div>
            ) : (
              <p className="muted small">サービス情報は未登録です。<a href={CORRECTION_FORM_URL} target="_blank" rel="noreferrer">情報提供フォーム</a>からお知らせください。</p>
            )}
          </section>

          {c.history?.length ? (
            <section className="panel">
              <h3>近況</h3>
              <ul className="co-history">
                {[...c.history].reverse().map((h) => (
                  <li key={h.text}><span>{h.date ? h.date.replace(/^(\d{4})-(\d{2}).*/, (_, y, m) => `${y}年${Number(m)}月`) : ''}</span>{h.text}{h.source && <a href={h.source} target="_blank" rel="noreferrer" className="h-src">出典</a>}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="panel">
            <h3>関連ニュース</h3>
            <NewsList items={news} empty="この企業に紐づくニュースはまだありません。" />
          </section>

          {articles.length > 0 && (
            <section className="panel">
              <h3>この企業を紹介している記事</h3>
              <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
                {articles.map((a) => (
                  <li key={a.slug}><Link href={`/articles/${a.slug}/`}>{a.title}</Link></li>
                ))}
              </ul>
            </section>
          )}

          {related.length > 0 && (
            <section>
              <h2 style={{ marginBottom: 12 }}>同じカテゴリの企業</h2>
              <div className="grid">
                {related.map((x) => (
                  <CompanyCard key={x.id} c={x} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside style={{ display: 'grid', gap: 16 }}>
          <section className="panel">
            <h3>企業情報</h3>
            <dl className="kv">
              {c.hp && (<><dt>Webサイト</dt><dd><a href={c.hp} target="_blank" rel="noreferrer">{c.hp.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a></dd></>)}
              <dt>上場区分</dt><dd><span className={`badge ${c.exit === '上場' ? 'listed' : ['閉鎖', '合併', '活動停止', '対象外'].includes(c.exit) ? 'closed' : ''}`}>{c.exit}</span>{c.listedMarket && <span className="small muted"> {c.listedMarket}</span>}</dd>
              {c.mergedInto && (<><dt>合併先</dt><dd>{c.mergedInto.companyId ? <Link href={`/companies/${c.mergedInto.companyId}/`}>{c.mergedInto.name}</Link> : c.mergedInto.name}<span className="small muted">（吸収合併により消滅）</span></dd></>)}
              {c.formerNames?.length ? (<><dt>旧社名</dt><dd>{c.formerNames.join('、')}</dd></>) : null}
              {c.foundedYear && (<><dt>創業</dt><dd>{c.foundedYear}年</dd></>)}
              {c.prefecture && (<><dt>所在地</dt><dd>{c.prefecture}</dd></>)}
              {c.address && (<><dt>本社住所</dt><dd>{c.address}</dd></>)}
              {c.employees && (<><dt>従業員数</dt><dd>{c.employeesAsOf ? c.employees : `${c.employees}人`}{empAsOf && <span className="small muted">（{empAsOf}時点）</span>}</dd></>)}
              {c.totalFunding && (<><dt>資金調達</dt><dd>{c.totalFunding}</dd></>)}
              {c.founders.length > 0 && (<><dt>創業者</dt><dd>{c.founders.map((n, i) => { const p = people.find((x) => x.name === n); return (<span key={n}>{i > 0 && '、'}{p ? <Link href={`/talents/${p.id}/`}>{n}</Link> : n}</span>); })}</dd></>)}
              {c.representatives.length > 0 && (<><dt>代表者</dt><dd>{c.representatives.map((n, i) => <span key={n}>{i > 0 && '、'}{personLink(n)}</span>)}
                {c.formerRepresentatives?.length ? (
                  <div className="rep-line" aria-label="歴代の代表者">
                    {c.formerRepresentatives.map((f) => (
                      <span key={f.name}>{personLink(f.name)}{f.until && <small>（〜{ym(f.until)}）</small>}<i aria-hidden="true">→</i></span>
                    ))}
                    <span className="now">{c.representatives.map((n, i) => <span key={n}>{i > 0 && '・'}{n}</span>)}<small>（現）</small></span>
                  </div>
                ) : null}
              </dd></>)}
              {c.origin && (<><dt>成り立ち</dt><dd>{c.origin}</dd></>)}
              {c.parentCompany && (<><dt>親会社</dt><dd>{c.parentCompany.split('、').map((pn, i) => { const pc = findCompanyByName(pn); return <span key={pn}>{i > 0 && '、'}{pc && pc.id !== c.id ? <Link href={`/companies/${pc.id}/`}>{pn}</Link> : pn}</span>; })}{c.parentNote && <span className="small muted">（{c.parentNote}）</span>}</dd></>)}
              {!c.parentCompany && c.parentNote && (<><dt>資本関係</dt><dd className="small">{c.parentNote}</dd></>)}
              {c.relatedCompanies.length > 0 && (<><dt>関連会社</dt><dd>{c.relatedCompanies.map((n, i) => { const r = findCompanyByName(n); return (<span key={n}>{i > 0 && '、'}{r && r.id !== c.id ? <Link href={`/companies/${r.id}/`}>{n}</Link> : n}</span>); })}</dd></>)}
              {c.corporateNumber && (<><dt>法人番号</dt><dd className="mono"><a href={c.corporateNumberUrl || `https://www.houjin-bangou.nta.go.jp/henkorireki-johoto.html?selHouzinNo=${c.corporateNumber}`} target="_blank" rel="noreferrer">{c.corporateNumber}</a></dd></>)}
              {c.formerCorporateNumbers?.length ? (<><dt>旧法人番号</dt><dd>{c.formerCorporateNumbers.map((f) => (
                <div key={f.number} className="former-corp"><a className="mono" href={`https://www.houjin-bangou.nta.go.jp/henkorireki-johoto.html?selHouzinNo=${f.number}`} target="_blank" rel="noreferrer">{f.number}</a>
                  <span className="small muted">{f.until ? `${ym(f.until)}まで` : ''}{f.note ? `（${f.note}）` : ''}</span></div>
              ))}</dd></>) : null}
            </dl>
          </section>
          <section className="notice">
            掲載情報に誤りや更新がある場合は、<a href={CORRECTION_FORM_URL} target="_blank" rel="noreferrer">情報修正を依頼する</a>からお知らせください。
            <div className="muted small" style={{ marginTop: 6 }}>
              出典: {c.source}{c.updatedAt && c.source.indexOf(c.updatedAt) < 0 ? `／${c.updatedAt.replace('-', '年')}月 編集部確認` : ''}
              {c.sources?.length ? (
                <ul className="co-src">
                  {c.sources.slice(0, 5).map((u) => <li key={u}><a href={u} target="_blank" rel="noreferrer">{srcLabel(u)}</a></li>)}
                </ul>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
