import { marked } from 'marked';
import { BASE_PATH } from './base';

marked.setOptions({ gfm: true, breaks: false });

export function renderMarkdown(md: string): string {
  const html = marked.parse(md) as string;
  // 記事本文のサイト内リンク（/companies/ など）に公開パスを付ける
  return BASE_PATH ? html.replace(/href="\/(?!\/)/g, `href="${BASE_PATH}/`) : html;
}
