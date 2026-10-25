import type { Service } from '@/lib/types';
import { ym } from '@/lib/ym';

/** 「医療機器 クラスII・承認」のような短い印。医療機器の情報が無い事業には何も出さない */
export function DeviceTag({ s }: { s: Service }) {
  if (!s.device) return null;
  const d = s.device;
  return <span className="dev-tag" title={[d.regulatoryClass, d.kind && `${d.kind}番号 ${d.number}`].filter(Boolean).join('・')}>医療機器{d.classLabel ? ` ${d.classLabel.replace('クラス', '')}` : ''}{d.kind ? `・${d.kind}` : ''}</span>;
}

const date = (s?: string) => (s ? s.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1年$2月$3日').replace(/^(\d{4})-(\d{2})$/, '$1年$2月') : '');

/** 事業のページの「医療機器としての情報」。医療機器かどうかを、承認・認証の番号と添付文書で示す */
export function DevicePanel({ s }: { s: Service }) {
  const d = s.device;
  if (!d) {
    return (
      <section className="panel dev-panel none">
        <h3>医療機器としての情報</h3>
        <p className="small">{s.status === '準備中' ? '医療機器としての承認・認証はまだありません（準備中）。' : 'このデータベースでは、医療機器としての承認・認証・届出の記録を確認していません。'}</p>
      </section>
    );
  }
  return (
    <section className="panel dev-panel">
      <h3>医療機器としての情報</h3>
      <p className="dev-head"><b>医療機器</b>{d.classLabel && <span>{d.classLabel}（{d.regulatoryClass}）</span>}{d.kind && <span>{d.kind}</span>}</p>
      <dl className="kv">
        {d.kind && d.number && (<><dt>{d.kind}番号</dt><dd>{d.number}</dd></>)}
        {d.approvedAt && (<><dt>{d.kind ?? '承認'}日</dt><dd>{date(d.approvedAt)}</dd></>)}
        {d.genericName && (<><dt>一般的名称</dt><dd>{d.genericName}{d.jmdn && <small>JMDNコード {d.jmdn}</small>}</dd></>)}
        {d.category && (<><dt>類別</dt><dd>{d.category}</dd></>)}
        {d.salesName && (<><dt>販売名</dt><dd>{d.salesName}</dd></>)}
        {d.maker && (<><dt>製造販売業者</dt><dd>{d.maker}</dd></>)}
        {d.specialMaintenance && (<><dt>保守</dt><dd>特定保守管理医療機器</dd></>)}
        <dt>添付文書</dt>
        <dd>
          {d.insertUrl && <a href={d.insertUrl} target="_blank" rel="noreferrer">最新の添付文書（PDF{d.insertDate ? `・${date(d.insertDate)}改訂` : ''}）</a>}
          <a href={d.pmdaUrl} target="_blank" rel="noreferrer">PMDA の掲載ページ</a>
        </dd>
      </dl>
      <p className="small muted">出典：PMDA 医療機器の添付文書検索{d.checkedAt ? `（${ym(d.checkedAt)}に確認）` : ''}</p>
    </section>
  );
}
