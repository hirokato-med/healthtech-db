import type { Metadata } from 'next';
import Link from 'next/link';
import { getPeople } from '@/lib/data';

export const metadata: Metadata = { title: '人物一覧', description: '国内ヘルステック企業の創業者・代表者の一覧。' };

export default function TalentsPage() {
  const people = getPeople();
  return (
    <>
      <div className="page-head">
        <div className="kicker">人物DB</div>
        <h1>人物一覧</h1>
        <p className="lead">企業DBに登録された創業者・代表者。複数企業に関わる人物は、所属がまとめて表示されます。</p>
      </div>
      <p className="count-text" style={{ margin: '12px 0 4px' }}><b>{people.length}</b> 名</p>
      <div className="people">
        <ul>
          {people.map((p) => (
            <li key={p.id}>
              <Link href={`/talents/${p.id}/`}>{p.name}</Link>
              <div className="small muted">{p.roles.map((r) => `${r.companyName}（${r.title}）`).join(' / ')}</div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
