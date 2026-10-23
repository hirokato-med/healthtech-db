import type { Metadata } from 'next';
import Link from 'next/link';
import fs from 'node:fs';
import path from 'node:path';
import { PartnerMap } from '@/components/PartnerMap';
import { RelationGraph, type REdge, type RNode } from '@/components/RelationGraph';
import { findCompanyByName, getPartnerships } from '@/lib/data';

export const metadata: Metadata = {
  title: 'M&A・提携マップ',
  description: '製薬会社とデジタルヘルス企業の提携、大手によるヘルスケア企業の買収・出資を、線でつないだマップ。終わった提携も記録している。',
};

const PHARMA = /製薬|ファーマ|薬品|Pharma|リリー|ノバルティス|ファイザー|アストラゼネカ|MSD|バイエル|ヤンセン|サノフィ|ベーリンガー|ノボ|参天|エーザイ|塩野義|第一三共|中外|協和キリン|アステラス|小野薬品|杏林|持田|Meiji|ツムラ|久光|大正製薬|ロート|あすか/;
const ym = (s?: string) => (s ? s.replace(/^(\d{4})-(\d{2}).*$/, (_, y, m) => `${y}年${Number(m)}月`).replace(/^(\d{4})$/, '$1年') : '');

export default function MaPage() {
  const ps = getPartnerships();
  const pharma = ps.filter((p) => PHARMA.test(p.from));
  const others = ps.filter((p) => !PHARMA.test(p.from));
  const names = [...new Set(ps.flatMap((p) => [p.from, p.to]))];
  const linkOf = Object.fromEntries(names.map((n) => { const c = findCompanyByName(n); return [n, c ? `/companies/${c.id}/` : undefined]; }));
  const rel = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'relations.json'), 'utf8')) as { nodes: RNode[]; edges: REdge[] };
  const name = Object.fromEntries(rel.nodes.map((n) => [n.id, n]));
  // 買い手別（親会社・合併先・出資元）
  const buyers = Object.values(
    rel.edges.reduce<Record<string, { id: string; items: REdge[] }>>((acc, e) => {
      (acc[e.from] ??= { id: e.from, items: [] }).items.push(e);
      return acc;
    }, {}),
  ).sort((a, b) => b.items.length - a.items.length);
  const TYPE: Record<string, string> = { parent: '買収・子会社化', merger: '吸収合併', investment: '出資', partnership: '提携' };

  return (
    <>
      <div className="page-head">
        <div className="kicker">M&amp;A / Partnerships</div>
        <h1>M&amp;A・提携マップ</h1>
        <p className="lead">
          誰が誰と組み、誰が誰を買ったのか。製薬会社とデジタルヘルス企業の提携、大手によるヘルスケア企業の買収・出資を線でつなぎました。
          終わった提携も消さずに残しています。提携 {ps.length} 件、M&amp;A・資本関係 {rel.edges.length} 件。
        </p>
        <nav className="reason-index" style={{ marginTop: 14 }}>
          <a href="#pharma">製薬 × デジタルヘルス<span>{pharma.length}</span></a>
          {others.length > 0 && <a href="#others">保険・通信・商社ほか × ヘルスケア<span>{others.length}</span></a>}
          <a href="#network">M&amp;Aネットワーク<span>{rel.edges.length}</span></a>
          <a href="#buyers">買い手・親会社別</a>
        </nav>
      </div>

      <section id="pharma" className="ma-sec">
        <h2>製薬 × デジタルヘルス 提携マップ</h2>
        <p className="muted small">左が製薬会社、右が提携先。線の上は提携の中身。灰色の点線は終わった提携。会社名をクリックすると企業ページへ。</p>
        <PartnerMap items={pharma} linkOf={linkOf} />
      </section>

      {others.length > 0 && (
        <section id="others" className="ma-sec">
          <h2>保険・通信・商社ほか × ヘルスケア 提携マップ</h2>
          <PartnerMap items={others} linkOf={linkOf} />
        </section>
      )}

      <section id="network" className="ma-sec">
        <h2>M&amp;Aネットワーク</h2>
        <p className="muted small">点が会社、矢印が「買った側 → 買われた側」。大きな点ほど多くの会社を傘下に持つ。</p>
        <RelationGraph nodes={rel.nodes} edges={rel.edges} />
      </section>

      <section id="buyers" className="ma-sec">
        <h2>買い手・親会社別の一覧</h2>
        <div className="buyer-grid">
          {buyers.filter((b) => b.items.length >= 1).map((b) => {
            const n = name[b.id];
            return (
              <div key={b.id} className="panel buyer">
                <h3>{n?.companyId ? <Link href={`/companies/${n.companyId}/`}>{n.name}</Link> : n?.name}<small>{b.items.length}社</small></h3>
                <ul>
                  {b.items.sort((x, y) => (x.date ?? '').localeCompare(y.date ?? '')).map((e) => {
                    const t = name[e.to];
                    return <li key={e.to + e.type}>{t?.companyId ? <Link href={`/companies/${t.companyId}/`}>{t.name}</Link> : t?.name}<span className="muted small">（{TYPE[e.type] ?? e.type}{e.date ? `・${ym(e.date)}` : ''}）</span></li>;
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
