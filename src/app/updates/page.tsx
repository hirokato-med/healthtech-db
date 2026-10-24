import type { Metadata } from 'next';
import Link from 'next/link';
import { UpdateList } from '@/components/UpdateList';
import { getUpdates } from '@/lib/data';

export const metadata: Metadata = {
  title: 'データの更新履歴',
  description: 'Healthtech DB のデータ（企業・事業・決算・資金調達・提携・記事）をいつ、どこを更新したかの記録。',
};

export default function UpdatesPage() {
  const updates = getUpdates();
  const months = [...new Set(updates.map((u) => u.date.slice(0, 7)))];
  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">トップ</Link> / <span>データの更新履歴</span></nav>
      <div className="page-head">
        <div className="kicker">Updates</div>
        <h1>データの更新履歴</h1>
        <p className="lead">企業・事業・決算・資金調達・提携・記事を、いつ、どこを更新したかの記録です。決算は TDnet から毎日自動で取り込み、ここにも載ります。</p>
      </div>
      {months.map((m) => (
        <section key={m} className="ma-sec">
          <h2>{m.replace(/^(\d{4})-(\d{2})$/, (_, y, mm) => `${y}年${Number(mm)}月`)}</h2>
          <UpdateList items={updates.filter((u) => u.date.startsWith(m))} now={updates[0]?.date ?? ''} />
        </section>
      ))}
    </>
  );
}
