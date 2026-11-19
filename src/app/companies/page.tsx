import type { Metadata } from 'next';
import { CompanyFilter } from '@/components/CompanyFilter';
import { getCategories, getCompanies } from '@/lib/data';

export const metadata: Metadata = { title: '企業一覧', description: 'ヘルスケア・ヘルステック企業の一覧。カテゴリ・上場や会社の状態・所在地で絞り込めます。' };

/** 一覧で既定では隠す、事業を終えた会社など（CompanyFilter と同じ） */
const ENDED = ['閉鎖', '合併', '活動停止', '対象外'];

export default function CompaniesPage() {
  // 「NEW」の印は出さない（会社を追加した日を持っていない）。トップの「2026年10月以降に収録した企業」から ?filter=new で開いたときの絞り込みにだけ、出典の「編集部調べ（2026-10 以降）」を使う
  const companies = getCompanies().map(({ id, name, categories, description, prefecture, foundedYear, exit, aliases, logo, major, source }) => ({ id, name, categories, description, prefecture, foundedYear, exit, aliases, logo, major, isNew: (source ?? '').startsWith('Healthtech DB 編集部調べ') }));
  const ended = companies.filter((c) => ENDED.includes(c.exit)).length;
  return (
    <>
      <div className="page-head">
        <div className="kicker">Companies</div>
        <h1>企業一覧</h1>
        <p className="lead">ヘルスケアの事業を手がける会社を {companies.length.toLocaleString('ja-JP')} 社掲載しています（事業を終えた会社など {ended} 社は、はじめは表示していません）。社名で探すか、カテゴリ・上場や会社の状態・所在地で絞り込んでください。</p>
      </div>
      <CompanyFilter companies={companies} categories={getCategories()} />
    </>
  );
}
