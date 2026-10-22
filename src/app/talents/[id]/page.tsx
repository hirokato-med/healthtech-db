import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CompanyCard } from '@/components/CompanyCard';
import { SectionHead } from '@/components/SectionHead';
import { CORRECTION_FORM_URL } from '@/components/Footer';
import { getCompany, getPeople, getPerson } from '@/lib/data';
import type { Company } from '@/lib/types';

export function generateStaticParams() {
  return getPeople().map((p) => ({ id: p.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = getPerson((await params).id);
  return { title: p?.name ?? '人物', description: p ? `${p.name} ── ${p.roles.map((r) => `${r.companyName} ${r.title}`).join('、')}` : undefined };
}

export default async function TalentPage({ params }: { params: Promise<{ id: string }> }) {
  const p = getPerson((await params).id);
  if (!p) notFound();
  const companies = p.roles.map((r) => getCompany(r.companyId)).filter((c): c is Company => Boolean(c));
  return (
    <div className="narrow">
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">トップ</Link>›<Link href="/talents/">人物</Link>›<span>{p.name}</span></nav>
      <div className="page-head" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <span className="tile" style={{ borderRadius: '50%', background: '#2DB34A' }} aria-hidden="true">{p.name.slice(0, 1)}</span>
        <div>
          <h1>{p.name}</h1>
          <p className="lead" style={{ marginTop: 2 }}>{p.roles.map((r) => `${r.companyName} ${r.title}`).join(' / ')}</p>
        </div>
      </div>
      <section className="section" style={{ marginTop: 20 }}>
        <SectionHead title="関わっている企業" count={`${companies.length}社`} />
        <div className="rows">{companies.map((c) => <CompanyCard key={c.id} c={c} />)}</div>
      </section>
      <p className="notice">経歴・所属・SNSリンクの追加や修正は<a href={CORRECTION_FORM_URL} target="_blank" rel="noreferrer">人物情報修正依頼フォーム</a>からお送りください。</p>
    </div>
  );
}
