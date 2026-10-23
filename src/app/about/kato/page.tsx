import type { Metadata } from 'next';
import Link from 'next/link';
import { withBase } from '@/lib/base';

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

const CAREER: [string, string][] = [
  ['2007', '浜松医科大学 医学部医学科を卒業。京都府立医科大学附属病院で初期臨床研修'],
  ['2009', '京都府立医科大学 眼科学教室。眼科専門医として白内障・緑内障など1,500件以上の手術を執刀。白内障手術器具「二刀流チョッパー（加藤式核分割チョッパー）」を開発'],
  ['2015', 'エクスメディオ Chief Medical Officer。眼科のDtoD遠隔医療サービス「メミルちゃん」を立ち上げ'],
  ['2016', '厚生労働省 医政局 研究開発振興課 治験推進室 室長補佐。臨床研究法の立案に携わり、厚労省初の医療ベンチャー政策「医療系ベンチャー育成支援プログラム」を立案'],
  ['2017', 'CureApp Chief Medical Officer（「アプリの治験」の開始）、MRT 社外取締役（オンライン診療「ポケットドクター」）。規制改革推進会議でオンライン診療の診療報酬化を提言'],
  ['2017', 'アイリス株式会社を共同創業（現 取締役副社長CSO）。日本医療ベンチャー協会の立ち上げに参加（理事）。デジタルハリウッド大学大学院 客員教授（2020年から特任教授）'],
  ['2018', '厚生労働省 医療ベンチャー支援（MEDISO）アドバイザー'],
  ['2019', '経済産業省 Healthcare Innovation Hub アドバイザー。ジャパン・ヘルスケアビジネスコンテスト（JHeC）最終審査員'],
  ['2021', '一橋大学大学院 経営管理研究科 MBA（金融戦略・経営財務）。Healthtech DB を立ち上げ'],
  ['2022', 'アイリスの「nodoca」が日本初のAI新医療機器として承認され、AI医療機器として初めて保険適用。医療DXのモデルクリニック「THIRD CLINIC GINZA」を共同で開院。東京医科歯科大学（現 東京科学大学）臨床教授'],
  ['2023', 'アイリスがスタートアップワールドカップ世界大会で優勝'],
  ['2026', 'Healthtech DB を、加藤浩晃の個人事業として再開'],
];

const BOOKS = [
  '『医療4.0 第4次産業革命時代の医療』（日経BP、2018）',
  '『医療4.0 実践編 これからのヘルステック戦略』（日経BP、2022）',
  '『デジタルヘルストレンド』2021・2022・2023（編著、メディカ出版）',
  '『医療×起業 医師・医療者のためのスタートアップ起業ガイド』（2024）',
  '『医療と算盤 2035年の医療崩壊を避け、2040年の医療を創る思考法』（メディカ出版、2025）',
  '『休養ベスト100 科学的根拠に基づく戦略的に休むスキル』（日経BP、2025）',
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
          <p className="lead">医師・MBA・ヘルスケア新規事業家。Healthtech DB をひとりでつくっている人です。</p>
          <div className="kato-links">
            {LINKS.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>)}
          </div>
        </div>
      </div>

      <article className="prose why">
        <p className="kato-intro">
          はじめまして、加藤浩晃です。眼科医として手術をして、厚生労働省で医療ベンチャーの政策をつくって、AI医療機器のスタートアップを共同で創業しました。「医療現場・医療制度・ビジネス」の3つを行き来しながら、ヘルスケアの新規事業に関わり続けています。
        </p>
        <p>
          この10年で200を超える事業の相談に乗ってきて、ビジネスコンテストの審査員として見てきたものも合わせると、500近い事業を見てきたと思います。その中で、同じアイデアが同じところで止まるのを何度も見てきました。それで、「事業開発の PubMed」をつくりたいと思い、Healthtech DB を個人事業として運営しています。どこかの会社の事業ではなく、自分個人の事業です。<Link href="/about/why/" className="arrow">Healthtech DB への想い</Link>
        </p>

        <h2>いま、やっていること</h2>
        <ul>
          <li><strong>Healthtech DB</strong>（個人事業）── 国内のヘルスケア企業・事業、そして止まった事業とその理由を記録するデータベース</li>
          <li><strong>アイリス株式会社</strong> 共同創業者・取締役副社長CSO ── AI医療機器「nodoca」の開発・保険適用</li>
          <li><strong>THIRD CLINIC GINZA</strong> 共同経営者・医師 ── 医療DXを実践するクリニック</li>
          <li><strong>Healthcare Startup Salon</strong> 主宰 ── ヘルスケアの起業家・社内起業家のコミュニティ（2017年の「ヘルスケアビジネス研究会」から発展）</li>
          <li>デジタルハリウッド大学大学院 特任教授、東京科学大学医学部 臨床教授</li>
          <li>YouTube「医療ビジネスチャンネル」で、毎月のヘルスケアニュースを振り返る <Link href="/monthly/">#月刊ヘルステック</Link> を配信</li>
        </ul>
        <p className="small muted">「2040年までに累計501社を支援する」「医療を革新する起業家・社内起業家を500人つくる」を目標に掲げています。</p>

        <h2>経歴</h2>
        <ol className="kato-career">
          {CAREER.map(([y, t], i) => <li key={i}><span>{y}</span>{t}</li>)}
        </ol>

        <h2>主な著書</h2>
        <ul>
          {BOOKS.map((b) => <li key={b}>{b}</li>)}
        </ul>

        <h2>主な委員・役職（これまで）</h2>
        <ul>
          <li>厚生労働省「情報通信機器を用いた診療に関するルール整備に向けた研究班」委員（2017）</li>
          <li>日本遠隔医療学会 遠隔診療モデル研究分科会 会長（2017〜2021）</li>
          <li>日本医療ベンチャー協会 理事（2017〜）</li>
          <li>厚生労働省 医療ベンチャー支援（MEDISO）アドバイザー（2018〜）</li>
          <li>経済産業省 J-Startup 推薦委員、Healthcare Innovation Hub アドバイザー</li>
          <li>AMED 医工連携イノベーション推進事業 審査委員 など</li>
        </ul>
        <p className="small muted">経歴の詳細は <a href="https://hiroakikato.jp/" target="_blank" rel="noreferrer">オフィシャルサイト</a> をご覧ください。</p>
      </article>

      <div className="why-links">
        <Link href="/about/why/" className="btn-outline arrow">Healthtech DB への想いを読む</Link>
        <Link href="/companies/" className="btn-outline arrow">企業データベースを見る</Link>
      </div>
    </>
  );
}
