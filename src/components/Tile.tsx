/** ロゴが無いときの代替タイル（Indeed の企業ロゴ枠のようなグレーの四角に頭文字） */
export function Tile({ text, size = 'md', kicker }: { text: string; color?: string; size?: 'md' | 'lg' | 'wide'; kicker?: string }) {
  return (
    <span className={`tile ${size === 'md' ? '' : size}`} aria-hidden="true">
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
