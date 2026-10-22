export function SearchBox({ defaultValue = '' }: { defaultValue?: string }) {
  return (
    <form className="search-form" action="/search/" method="get" role="search">
      <input type="search" name="q" placeholder="企業名・サービス名・人物" aria-label="検索" defaultValue={defaultValue} />
      <button type="submit">検索</button>
    </form>
  );
}
