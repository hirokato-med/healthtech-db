import type { Metadata } from 'next';
import { CompanyFilter } from '@/components/CompanyFilter';
import { getCategories, getCompanies } from '@/lib/data';

export const metadata: Metadata = { title: '企業一覧', description: 'ヘルスケア・ヘルステック企業の一覧。カテゴリ・上場や会社の状態・所在地で絞り込めます。' };

/** 一覧で既定では隠す、事業を終えた会社など（CompanyFilter と同じ） */
const ENDED = ['閉鎖', '合併', '活動停止', '対象外'];

export default function CompaniesPage() {
  // 「NEW」の印は、会社を追加した日を持っていないので出さない（出典の種類で決めると7割以上に付き、新着の目印にならない）
  const companies = getCompanies().map(({ id, name, categories, description, prefecture, foundedYear, exit, aliases, logo, major }) => ({ id, name, categories, description, prefecture, foundedYear, exit, aliases, logo, major }));
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
