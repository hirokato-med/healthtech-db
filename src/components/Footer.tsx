import Link from 'next/link';

export const CORRECTION_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfOdqB0zZagrPQh2DqSsLvp2R_rLhudYyrRzungnipMVjQG7A/viewform';
export const NEWSLETTER_URL = 'https://hiroakikato.substack.com/';
export const X_URL = 'https://twitter.com/db_healthtech';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container cols">
        <div>
          <h4>Healthtech DB</h4>
          <p>
            ヘルスケア領域に特化した事業DB。国内のヘルスケアビジネスを、企業・サービス・人物・ニュース・記事でつなげて見渡せるようにします。
            <br />
            2021年に DX Healthcare として開始、2023年6月に一時閉鎖。本サイトは当時のデータと設計をもとにした復刻版です。
          </p>
        </div>
        <div>
          <h4>データベース</h4>
          <ul>
            <li><Link href="/companies/">企業一覧</Link></li>
            <li><Link href="/services/">サービス一覧</Link></li>
            <li><Link href="/talents/">人物一覧</Link></li>
            <li><Link href="/categories/">カテゴリ一覧</Link></li>
            <li><Link href="/global/">海外企業</Link></li>
          </ul>
        </div>
        <div>
          <h4>コンテンツ</h4>
          <ul>
            <li><Link href="/articles/">記事</Link></li>
            <li><Link href="/articles/archive/">記事アーカイブ</Link></li>
            <li><Link href="/news/">ニュース</Link></li>
            <li><Link href="/webinars/">マンスリーレビュー</Link></li>
            <li><a href={NEWSLETTER_URL} target="_blank" rel="noreferrer">メルマガ（Substack）</a></li>
          </ul>
        </div>
        <div>
          <h4>Healthtech DB について</h4>
          <ul>
            <li><Link href="/about/">運営・沿革</Link></li>
            <li><a href={CORRECTION_FORM_URL} target="_blank" rel="noreferrer">情報修正依頼フォーム</a></li>
            <li><Link href="/terms/">利用規約（草案）</Link></li>
            <li><Link href="/privacy/">プライバシーポリシー（草案）</Link></li>
            <li><a href={X_URL} target="_blank" rel="noreferrer">X @db_healthtech</a></li>
          </ul>
        </div>
      </div>
      <div className="container" style={{ marginTop: 20 }}>
        © 2021-2026 Healthtech DB. 企業情報は各社公表資料・法人番号公表サイト等に基づきます。
      </div>
    </footer>
  );
}
