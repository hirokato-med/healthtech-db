import type { Metadata } from 'next';
import Link from 'next/link';
import { withBase } from '@/lib/base';
import { PROFILE_600, PROFILE_SECTIONS, PROFILE_TITLE } from '@/content/profile';

export const metadata: Metadata = {
  title: '加藤浩晃について',
  description: 'Healthtech DB をひとりでつくっている、医師・加藤浩晃の自己紹介。眼科医、厚生労働省、アイリス共同創業、そして500近い事業を見てきた事業家として。',
};

const LINKS = [
  { href: 'https://hiroakikato.jp/', label: 'オフィシャルサイト' },
  { href: 'https://twitter.com/HiroakiKato', label: 'X（@HiroakiKato）' },
  { href: 'https://www.youtube.com/channel/UCK3AJBi4WTqc2yFICN-yrSw', label: 'YouTube「医療ビジネスチャンネル」' },
  { href: 'https://note.com/hiroakikato/m/m24d28e71b675', label: 'note' },
  { href: 'https://hiroakikato.substack.com/', label: 'メルマガ' },
];

export default function KatoPage() {
  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">トップ</Link> / <Link href="/about/">Healthtech DB について</Link> / <span>加藤浩晃について</span></nav>
      <div className="page-head kato-head">
        <img className="kato-mark" src={withBase('/images/kato-avatar.jpg')} alt="加藤浩晃" width={96} height={96} />
        <div>
          <div className="kicker">The person behind Healthtech DB</div>
          <h1>加藤 浩晃<small>かとう ひろあき</small></h1>
          <p className="lead">{PROFILE_TITLE}。Healthtech DB を個人事業としてつくっています。</p>
          <div className="kato-links">
            {LINKS.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>)}
          </div>
        </div>
      </div>

      <article className="prose why">
        <p className="kato-intro">
          はじめまして、加藤浩晃です。Healthtech DB は、自分の個人事業としてつくっています。どこかの会社の事業ではありません。医療の事業化に15年以上関わる中で、同じアイデアが同じところで止まるのを何度も見てきて、「事業開発の PubMed」をつくりたいと思いました。<Link href="/about/why/" className="arrow">Healthtech DB への想い</Link>
        </p>

        <h2>プロフィール</h2>
        <div className="profile-600">
          <p className="pf-name">加藤浩晃（かとう・ひろあき）<span>{PROFILE_TITLE}</span></p>
          {PROFILE_600.map((t) => <p key={t.slice(0, 12)}>{t}</p>)}
        </div>

        <h2>略歴</h2>
        <dl className="kato-sections">
          {PROFILE_SECTIONS.map((sec) => (
            <div key={sec.label}>
              <dt>{sec.label}</dt>
              <dd><ul>{sec.items.map((t) => <li key={t}>{t}</li>)}</ul></dd>
            </div>
          ))}
        </dl>

        <h2>いま、Healthtech DB でやっていること</h2>
        <ul>
          <li>国内のヘルスケア企業・事業を、閉鎖・合併したものも含めて出典つきで記録</li>
          <li>事業がどこで止まったのかを、テーマごとの年表と解説記事で読み解く</li>
          <li>YouTube「医療ビジネスチャンネル」で、毎月のヘルスケアニュースを振り返る <Link href="/monthly/">#月刊ヘルステック</Link> を配信</li>
        </ul>
      </article>

      <div className="why-links">
        <Link href="/about/why/" className="btn-outline arrow">Healthtech DB への想いを読む</Link>
        <Link href="/companies/" className="btn-outline arrow">企業データベースを見る</Link>
      </div>
    </>
  );
}
