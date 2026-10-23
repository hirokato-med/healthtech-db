/** ロゴマーク（紺の H に水色の点。薬事情報ナビのロゴの雰囲気に合わせた幾何学的な形） */
export function LogoMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M4 5h5v9h9V5h5v22h-5v-8H9v8H4z" fill="currentColor" />
      <rect x="25" y="3" width="4" height="4" fill="#0e7c86" />
      <rect x="25" y="9" width="4" height="4" fill="#0e7c86" opacity=".5" />
    </svg>
  );
}
