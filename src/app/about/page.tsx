import type { Metadata } from 'next';
import Link from 'next/link';
import { CORRECTION_FORM_URL, NEWSLETTER_URL, X_HANDLE, X_URL } from '@/components/Footer';

export const metadata: Metadata = { title: 'Healthtech DB について', description: 'Healthtech DB の運営・沿革・データの出典。' };

export default function AboutPage() {
  return (
    <>
      <div className="page-head">
        <div className="kicker">About</div>
        <h1>Healthtech DB について</h1>
        <p className="lead">「日本のヘルスケア産業を加速させる！ もう車輪の再発明はいらない！」</p>
      </div>
      <article className="prose">
        <h2>何のためのサイトか</h2>
        <p>
          Healthtech DB は、<strong>事業開発の PubMed</strong> を目指すヘルスケアの事業データベースです。研究にはPubMedがあり、先人の成果の上から始められます。事業開発には、過去にどんな事業があり、それがなぜ止まったのかをまとめた場所がありません。そのため、同じようなアイデアが生まれ、同じように止まってしまいます。
        </p>
        <p>
          そこで、①過去から現在までの会社・事業を客観的なデータとして記録し（閉鎖・合併・活動停止した会社も消さずに残します）、②事業がどのような理由で止まったのかを解説記事で読み解きます。
          <Link href="/about/why/" className="arrow">加藤浩晃の、Healthtech DB への想い</Link>
        </p>
        <h2>運営者</h2>
        <p>
          Healthtech DB は、医師・<Link href="/about/kato/">加藤浩晃</Link>の<strong>個人事業</strong>です。企業・事業データの調査と更新、解説記事の「加藤浩晃の視点」「加藤浩晃の見立て」は、加藤が責任を持って運営しています。
          <Link href="/about/kato/" className="arrow">加藤浩晃について</Link>
        </p>
        <h2>沿革</h2>
        <ul>
          <li>2021年3月 ── アイリス株式会社の新規事業「DX Healthcare」として、医学生・医師ライターによる記事制作を開始</li>
          <li>2021年5月 ── 企業DBの開発開始（週次の Biz 定例を開始）</li>
          <li>2021年10月 ── 「Healthtech DB」へ名称変更、healthtech-db.com を公開</li>
          <li>2021年11〜12月 ── 人物情報・サービス情報・検索・会員登録・メルマガを開始</li>
          <li>2023年6月30日 ── 一時閉鎖</li>
          <li>2024年12月 ── YouTube「医療ビジネスチャンネル」で、毎月のニュースを振り返るライブ配信「#月刊ヘルステック」を開始</li>
          <li>2026年10月 ── 加藤浩晃の個人事業として再開（本サイト）。企業DBを564社に更新し、記事を2026年時点の内容で書き直し</li>
        </ul>
        <h2>データの出典</h2>
        <ul>
          <li>企業情報: 各社Webサイト・プレスリリース・取引所の開示資料。2021年9月時点の投入データ（336社）を基礎に、2026年10月に編集部が近況を確認して反映し、2018年以降に創業・台頭した企業を中心に231社を追加しました</li>
          <li>法人の登記情報（商号・本店所在地・合併・閉鎖の履歴）: 国税庁法人番号公表サイト（国税庁）（https://www.houjin-bangou.nta.go.jp/）を加工して作成</li>
          <li>事業所の厚生年金保険の適用状況（全喪の確認）: 日本年金機構「厚生年金保険・健康保険 適用事業所検索システム」</li>
          <li>ニュース: PR TIMES のプレスリリース（自動収集。表題・配信元・URLのみを掲載し、本文は配信元で確認してください）</li>
          <li>サービス情報: 各社公表資料</li>
          <li>人物情報: 各社公表の役員情報（創業者・代表者）</li>
        </ul>
        <h2>情報の修正・掲載依頼</h2>
        <p>
          掲載情報の誤り、更新、新規掲載のご希望は<a href={CORRECTION_FORM_URL} target="_blank" rel="noreferrer">情報修正依頼フォーム</a>からお送りください。最新情報は{X_URL && <><a href={X_URL} target="_blank" rel="noreferrer">X（@{X_HANDLE}）</a>と</>}<a href={NEWSLETTER_URL} target="_blank" rel="noreferrer">メルマガ</a>でお知らせします。
        </p>
        <p>
          <Link href="/articles/healthtech-db-relaunch/">復刻版についての詳しいお知らせ</Link>
        </p>
      </article>
    </>
  );
}
