import { marked } from 'marked';
import { BASE_PATH } from './base';

marked.setOptions({ gfm: true, breaks: false });

export function renderMarkdown(md: string): string {
  // 表は横スクロールできる枠で包む（スマホで列がつぶれないように）
  const html = (marked.parse(md) as string).replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>')
    // 「2021年11月」「49%」のような短いセルは折り返さない
    .replace(/<td>([^<]{1,10})<\/td>/g, '<td class="nw">$1</td>');
  // 記事本文のサイト内リンク（/companies/ など）に公開パスを付ける
  return BASE_PATH ? html.replace(/href="\/(?!\/)/g, `href="${BASE_PATH}/`) : html;
}
