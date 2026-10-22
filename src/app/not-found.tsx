import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="page-head" style={{ padding: '40px 0' }}>
      <div className="kicker">404</div>
      <h1>ページが見つかりません</h1>
      <p className="lead">URL が変わったか、削除された可能性があります。<Link href="/search/">検索</Link>または<Link href="/">トップ</Link>からお探しください。</p>
    </div>
  );
}
