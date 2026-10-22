import type { Metadata } from 'next';
import { CompanyFilter } from '@/components/CompanyFilter';
import { getCategories, getCompanies } from '@/lib/data';

export const metadata: Metadata = { title: '企業一覧', description: '国内ヘルスケア・ヘルステック企業の一覧。カテゴリ・上場区分・所在地で絞り込めます。' };

export default function CompaniesPage() {
  const companies = getCompanies().map(({ id, name, categories, description, prefecture, foundedYear, exit }) => ({ id, name, categories, description, prefecture, foundedYear, exit }));
  return (
    <>
      <div className="page-head">
        <div className="kicker">Companies</div>
        <h1>企業一覧</h1>
        <p className="lead">国内のヘルスケアビジネスを手がける {companies.length} 社。社名で探すか、カテゴリ・上場区分・所在地で絞り込んでください。</p>
      </div>
      <CompanyFilter companies={companies} categories={getCategories()} />
    </>
  );
}
