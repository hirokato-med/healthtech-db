/** ロゴ・画像が無いときの代替タイル。分類色で塗り、白文字で頭文字や分類名を出す */
export function Tile({ text, color = '#1E6FE8', size = 'md', kicker }: { text: string; color?: string; size?: 'md' | 'lg' | 'wide'; kicker?: string }) {
  return (
    <span className={`tile ${size === 'md' ? '' : size}`} style={{ background: color }} aria-hidden="true">
      {kicker && <small>{kicker}</small>}
      {text}
    </span>
  );
}

/** 社名から頭文字（株式会社などを除く） */
export const initialOf = (name: string) => {
  const s = name.replace(/^(株式会社|有限会社|合同会社|一般社団法人)\s*/, '').replace(/\s*(株式会社)$/, '').trim();
  return s.slice(0, 1).toUpperCase();
};
