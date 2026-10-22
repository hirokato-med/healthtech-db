import { withBase } from '@/lib/base';

/** Indeed 型の検索バー（医師ビジネスマッチングと同じ形） */
export function SearchBar({ defaultValue = '', autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  return (
    <form className="searchbar" action={withBase('/search/')} method="get" role="search">
      <label className="in">
        <span>キーワード</span>
        <input type="search" name="q" placeholder="企業名・サービス名・人物・カテゴリ" defaultValue={defaultValue} autoFocus={autoFocus} />
      </label>
      <button type="submit" className="btn primary lg">検索する</button>
    </form>
  );
}
