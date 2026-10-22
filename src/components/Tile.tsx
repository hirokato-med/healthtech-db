/** 画像・ロゴが無いときの代替タイル（分類色 10% の下地に頭文字 or 分類名） */
export function Tile({ text, group, size = 'md', kicker }: { text: string; group?: string; size?: 'md' | 'lg' | 'wide'; kicker?: string }) {
  return (
    <span className={`tile ${group ?? ''} ${size === 'md' ? '' : size}`} aria-hidden="true">
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
