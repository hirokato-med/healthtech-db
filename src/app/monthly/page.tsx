import type { Metadata } from 'next';
import { episodeHeadline, getMonthly, monthLabel, YT_CHANNEL, YT_SUBSCRIBE, ytThumb } from '@/lib/data';

export const metadata: Metadata = {
  title: '#月刊ヘルステック',
  description: '1か月分のヘルステックニュースを、加藤浩晃と有村琢磨がYouTube Liveで読み解く「#月刊ヘルステック」。全配信回のアーカイブ。',
};

const HOSTS = [
  { name: '加藤浩晃', role: '医師／医療ビジネスチャンネル主宰', note: '元厚生労働省。アイリス株式会社の共同創業者として医療機器の開発・承認に関わり、医療とビジネスの両側からニュースを読み解きます。' },
  { name: '有村琢磨', role: '株式会社ポテック 代表取締役', note: '製薬・医療機器・IT企業のヘルスケア新規事業を支援。業界の勢力図を描く「ヘルスケアカオスマップ」の作成でも知られます。' },
];

const WHAT = [
  { h: '選ぶ', p: 'その月に出た資金調達・提携・薬事承認・制度改定のニュースから、事業への影響が大きいものを絞り込みます。' },
  { h: '読み解く', p: '発表文に書かれていない背景──誰が、なぜ今、どんな収益モデルで動いているのか──を2人の視点で掘り下げます。' },
  { h: '先を読む', p: '「次に何が動くのか」「自社ならどう向き合うか」まで話すのが、この番組の持ち味です。' },
];

export default function MonthlyPage() {
  const eps = getMonthly();
  const latest = eps[0];
  const years = [...new Set(eps.map((e) => e.month.slice(0, 4)))];
  return (
    <>
      <div className="page-head">
        <div className="kicker">YouTube Live</div>
        <h1>#月刊ヘルステック</h1>
        <p className="lead">1か月分のヘルステックニュースを、ライブで読み解く番組です。YouTube「医療ビジネスチャンネル」で毎月配信しています。アーカイブ {eps.length} 回。</p>
      </div>

      {latest && (
        <section className="mo-hero">
          <div className="mo-player">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${latest.videoId}`}
              title={latest.title}
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          <div className="mo-side">
            <span className="mo-badge">最新回</span>
            <div className="mo-month">{monthLabel(latest.month)}</div>
            <h2>{episodeHeadline(latest)}</h2>
            <div className="mo-steps">
              {WHAT.map((w, i) => (
                <div key={w.h}><b>{String(i + 1).padStart(2, '0')}</b><span><strong>{w.h}</strong>{w.p}</span></div>
              ))}
            </div>
            <div className="mo-btns">
              <a href={latest.url} target="_blank" rel="noreferrer" className="btn primary">YouTubeで見る</a>
              <a href={YT_SUBSCRIBE} target="_blank" rel="noreferrer" className="btn-outline">チャンネル登録</a>
            </div>
          </div>
        </section>
      )}

      <section className="mo-hosts">
        {HOSTS.map((h) => (
          <div key={h.name} className="mo-host">
            <span className="av">{h.name.slice(0, 1)}</span>
            <div>
              <div className="role">{h.role}</div>
              <div className="nm">{h.name}</div>
              <p>{h.note}</p>
            </div>
          </div>
        ))}
      </section>

      {years.map((y) => (
        <section key={y} className="mo-year">
          <h2>{y}年<small>{eps.filter((e) => e.month.startsWith(y)).length}回</small></h2>
          <div className="mo-grid">
            {eps.filter((e) => e.month.startsWith(y)).map((e) => (
              <a key={e.videoId} id={e.videoId} href={e.url} target="_blank" rel="noreferrer" className="mo-ep">
                <span className="th"><img src={ytThumb(e.videoId, 'mq')} alt="" loading="lazy" /><i aria-hidden="true" /></span>
                <span className="m">{monthLabel(e.month)}</span>
                <span className="t">{episodeHeadline(e)}</span>
              </a>
            ))}
          </div>
        </section>
      ))}

      <p className="small muted" style={{ marginTop: 32 }}>
        配信予定とライブのお知らせは <a href={YT_CHANNEL} target="_blank" rel="noreferrer">医療ビジネスチャンネル</a> で。新しい回は毎朝このページに自動で追加されます。
      </p>
    </>
  );
}
