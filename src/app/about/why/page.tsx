import type { Metadata } from 'next';
import Link from 'next/link';
import { STOPPED, getCompanies, getPartnerships, getServices } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Healthtech DB への想い',
  description: '研究にはPubMedがある。事業開発にも、過去の事業と、それがなぜ止まったのかを引ける場所が必要だ。医師・加藤浩晃が個人事業として、狂気のヘルスケアビジネスDBをつくる理由。',
};

export default function WhyPage() {
  const companies = getCompanies().length;
  const services = getServices();
  const stopped = services.filter((s) => STOPPED.includes(s.status)).length;
  const links = getPartnerships().length;
  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">トップ</Link> / <Link href="/about/">Healthtech DB について</Link> / <span>Healthtech DB への想い</span></nav>
      <div className="page-head">
        <div className="kicker">Why I built this</div>
        <h1>事業開発の PubMed をつくりたい</h1>
        <p className="lead">Healthtech DB は、医師・<Link href="/about/kato/">加藤浩晃</Link>が個人事業としてつくっている、狂気のヘルスケアビジネスDBです。</p>
      </div>

      <article className="prose why">
        <h2>研究には、PubMed がある</h2>
        <p>
          研究の世界には PubMed があります。いま世界で誰が、何を、どこまで明らかにしているのかを、誰でも調べることができます。
          だから研究者は、すでに分かっていることをもう一度やり直す必要がありません。先人の積み重ねの上に立って、その先から始められる。
          「巨人の肩に乗る」ということが、仕組みとして成り立っています。
        </p>

        <h2>事業開発には、それがない</h2>
        <p>
          ところが、事業開発にはそれがありません。
          ヘルスケアの領域で、これまでにどんな事業が立ち上がり、どこまで進み、そしてどのように止まったのか。それがまとまっている場所は、どこにもありません。
        </p>
        <p>
          その結果、何が起きているか。
          <strong>同じような新規事業のアイデアが、何度も生まれる。そして、同じようなところで、同じように止まってしまう。</strong>
          事業の世界では、車輪の再発明がいまも繰り返されています。
        </p>
        <p>
          私はこの10年で、200を超える事業の相談に乗ってきました。ビジネスコンテストなどの審査員として見てきたものが年に50件ほどあり、
          合わせると500件近い事業に触れてきたと思います。
          その中で、本当に同じような話を、1年のうちに5件も6件も聞くことがあります。
          それぞれが、自分たちの「新規事業」として。
        </p>
        <p>
          うまくいった事業の話は、記事や講演でよく語られます。けれど、止まった事業の話はほとんど残りません。
          会社がなくなればサイトは消え、ドメインは別の誰かのものになり、そこで何が試され、何が壁になったのかは、関わった人の記憶の中にしか残らない。
          本当は、そこにこそ次に挑む人が知るべきことが詰まっているはずです。
        </p>

        <h2>だから、Healthtech DB をつくりました</h2>
        <div className="why-stats">
          <div><b>{companies}</b><span>社の企業</span></div>
          <div><b>{services.length}</b><span>件の事業</span></div>
          <div><b>{stopped}</b><span>件の止まった事業</span></div>
          <div><b>{links}</b><span>本の提携・M&amp;Aの線</span></div>
        </div>
        <p>Healthtech DB は、<strong>事業開発の PubMed</strong> のつもりでつくっています。やりたいことは2つです。</p>
        <ol>
          <li>
            <strong>過去にどんな事業があったのかを、客観的なデータとして残すこと。</strong><br />
            会社、サービス、始まった時期、資金調達、提携、買収、そして終わった時期。公式の発表や公的な記録をもとに、出典を付けて記録します。
          </li>
          <li>
            <strong>その事業が、どのような理由で止まったのかを解説すること。</strong><br />
            規制なのか、お金を払う人が見つからなかったのか、医療現場の業務に入り込めなかったのか、資金が続かなかったのか、大きな会社に統合されたのか。公開されている事実をもとに、解説記事で読み解きます。
          </li>
        </ol>

        <h2>個人の事業として、狂気でやる</h2>
        <p>
          Healthtech DB は、どこかの会社の事業ではありません。<strong>加藤浩晃の個人事業</strong>です。
        </p>
        <p>
          国内のヘルスケア企業を一社ずつ調べ、登記を確かめ、閉鎖や合併の記録を拾い、事業がいつ始まりいつ止まったのかを年表にし、
          止まった理由を公表資料から読み解く。正直に言って、正気の沙汰ではない作業です。
          でも、誰かがやらなければ、止まった事業の記録は消えていくだけです。だから、狂気のヘルスケアビジネスDBとして、個人でやり切ります。
        </p>
        <p>
          会社の看板ではなく自分の名前でやるのは、止まった事業や、うまくいかなかった提携も、遠慮なく記録として残すためでもあります。
          解説記事にある「加藤浩晃の視点」「加藤浩晃の見立て」は、その記録を読んだうえでの、私個人の考えです。
        </p>

        <h2>大事にしていること</h2>
        <ul>
          <li>
            <strong>終わった会社・事業も、消さずに残します。</strong>
            閉鎖した会社、合併で消えた会社、活動が確認できなくなった会社も、そのまま記録として載せています。成功例だけを並べたデータベースでは、同じ失敗は防げないからです。
          </li>
          <li>
            <strong>事実と推測を分けます。</strong>
            「終わった」と書くのは、登記や本人の発表など、根拠がそろったときだけです。分からないことは、分からないと書きます。
          </li>
          <li>
            <strong>すべてに出典を付けます。</strong>
            読んだ人が自分で一次情報に当たれるようにしています。
          </li>
        </ul>

        <h2>これから挑む人へ</h2>
        <p>
          ヘルスケアで新しい事業を考えたとき、まずここで調べてみてください。
          同じことを考えた人がいたかもしれません。その人たちがどこまで進み、どこで止まったのかが分かれば、同じ壁の手前で別の道を選ぶことも、その壁を越える準備をしてから挑むこともできます。
        </p>
        <p>
          先人の挑戦を、次の挑戦の土台にする。ヘルスケアの事業開発でも、巨人の肩に乗れるようにする。それが Healthtech DB の目指すところです。
        </p>
        <p>
          そして、もしあなたが関わった事業がここに載っていたら、あるいは載るべき事業があれば、ぜひ教えてください。一つひとつの記録が、次に挑む誰かの助けになります。
        </p>

        <div className="signature">
          <p>Healthtech DB 運営（個人事業）</p>
          <p className="name"><Link href="/about/kato/">加藤 浩晃</Link></p>
          <p className="small muted">医師・MBA。元厚生労働省。アイリス株式会社 共同創業者・取締役副社長CSO。YouTube「医療ビジネスチャンネル」で <Link href="/monthly/">#月刊ヘルステック</Link> を配信。<Link href="/about/kato/">自己紹介を読む</Link></p>
        </div>
      </article>

      <div className="why-links">
        <Link href="/companies/" className="btn-outline arrow">企業データベースを見る</Link>
        <Link href="/articles/" className="btn-outline arrow">解説記事を読む</Link>
      </div>
    </>
  );
}
