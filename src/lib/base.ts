/**
 * サイトの公開パス。GitHub Pages（https://hirokato-med.github.io/healthtech-db/）では "/healthtech-db"、
 * 独自ドメインや Vercel では空文字。next/link は自動で付くが、<form action>・fetch・記事本文のリンクは手で付ける。
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export const withBase = (path: string) => (path.startsWith('/') ? `${BASE_PATH}${path}` : path);
