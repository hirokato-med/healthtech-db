#!/usr/bin/env node
/**
 * 各社の公式サイトからロゴを取り、public/logos/{id}.png に置いて data/companies.json の logo に記録する。
 *
 *   node pipeline/logos.mjs                 # ロゴが無い会社だけ
 *   node pipeline/logos.mjs --ids a,b,c     # 指定した会社だけ（取り直す）
 *   node pipeline/logos.mjs --limit 20
 *
 * - 公式サイトのページ上部（ヘッダー）にある「logo」と名の付いた画像・SVG を探し、その部分をそのまま切り出す（形・色は変えない）。
 * - 見つからなければ apple-touch-icon（サイトのアイコン）を使い、kind を icon にする。
 * - logo: { file, kind: header|icon, source, checkedAt, tone }（tone: light は白いロゴ。暗い背景に置いて見せる）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// playwright はこのリポジトリの依存ではなく、実行する環境に入っているものを使う
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
// 切り出したロゴのまわりの余白（透明・白）を落とす。sharp が無ければそのまま
let sharp = null;
try { sharp = require('sharp'); } catch { /* なし */ }
// 画像（PNG・JPEG・SVG・WebP）を、余白を落とした PNG にする。高さは最大 240px
const toPng = async (buf, file) => {
  try { const out = await sharp(buf, { density: 300 }).trim({ threshold: 10 }).resize({ height: 240, withoutEnlargement: true }).png().toBuffer(); fs.writeFileSync(file, out); return true; } catch { return false; }
};
// 白っぽいロゴ（暗い背景の上に置く前提のもの）か。見えている画素の明るさの平均で見る
const isLight = async (file) => {
  if (!sharp) return false;
  try {
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let sum = 0, n = 0, clear = 0;
    for (let i = 0; i < data.length; i += info.channels) { if (data[i + 3] > 128) { sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; n++; } else clear++; }
    // 透明な部分がある画像だけ（白い背景ごとの JPEG を白いロゴと取り違えない）
    return n > 0 && clear / (n + clear) > 0.1 && sum / n > 225;
  } catch { return false; }
};
const trim = async (file) => {
  if (!sharp) return;
  try { const buf = await sharp(file).trim({ threshold: 10 }).png().toBuffer(); fs.writeFileSync(file, buf); } catch { /* 1色だけの画像などはそのまま */ }
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = path.join(ROOT, 'data', 'companies.json');
const OUT = path.join(ROOT, 'public', 'logos');
fs.mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const ids = opt('--ids')?.split(',');
const limit = Number(opt('--limit') ?? Infinity);
const today = new Date().toISOString().slice(0, 7);

const companies = JSON.parse(fs.readFileSync(F, 'utf8'));
const targets = companies.filter((c) => c.hp && (ids ? ids.includes(c.id) : !c.logo) && !['閉鎖', '合併', '活動停止'].includes(c.exit)).slice(0, limit);

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36' });
let got = 0, icon = 0, none = 0;
for (const c of targets) {
  const page = await ctx.newPage();
  const file = path.join(OUT, `${c.id}.png`);
  try {
    await page.goto(c.hp, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    // ページ上部の「logo」らしい要素：img・svg・背景画像つきのリンク
    const handle = await page.evaluateHandle(() => {
      const isLogo = (el) => /logo|brand|site-?title|header__title/i.test([el.className?.baseVal ?? el.className, el.id, el.getAttribute?.('alt'), el.getAttribute?.('src'), el.getAttribute?.('aria-label')].join(' '));
      const cands = [...document.querySelectorAll('img, svg, a, h1, div, span')].filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.top > 220 || r.width < 40 || r.height < 12 || r.width > 520 || r.height > 160) return false;
        const st = getComputedStyle(el);
        if (st.visibility === 'hidden' || st.display === 'none' || Number(st.opacity) === 0) return false;
        if (el.tagName === 'IMG' || el.tagName === 'svg') return isLogo(el) || isLogo(el.parentElement ?? el) || (el.closest('a')?.getAttribute('href') ?? '').match(/^(\/|\.\/|https?:\/\/[^/]+\/?)$/);
        return isLogo(el) && (el.querySelector('img,svg') || st.backgroundImage !== 'none');
      });
      // img/svg を優先し、左上に近いもの
      cands.sort((a, b) => (/(IMG|svg)/.test(b.tagName) - /(IMG|svg)/.test(a.tagName)) || (a.getBoundingClientRect().left + a.getBoundingClientRect().top) - (b.getBoundingClientRect().left + b.getBoundingClientRect().top));
      const el = cands[0];
      if (!el) return null;
      // 中に1つだけ img/svg があればそれを切り出す
      const inner = el.tagName !== 'IMG' && el.tagName !== 'svg' ? el.querySelector('img,svg') : null;
      return inner ?? el;
    });
    const el = handle.asElement();
    if (el) {
      // 背景の写真などが写り込まないよう、画像はファイルそのものを、SVG は SVG のまま取る。どちらも無理なら画面から切り出す
      const info = await el.evaluate((e) => {
        if (e.tagName === 'IMG') return { kind: 'img', src: e.currentSrc || e.src };
        if (e.tagName.toLowerCase() === 'svg') {
          const c = e.cloneNode(true);
          const r = e.getBoundingClientRect();
          c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          if (!c.getAttribute('width')) c.setAttribute('width', String(Math.round(r.width)));
          if (!c.getAttribute('height')) c.setAttribute('height', String(Math.round(r.height)));
          c.setAttribute('color', getComputedStyle(e).color); // fill="currentColor" の色を残す
          return { kind: 'svg', svg: c.outerHTML };
        }
        return { kind: 'other' };
      });
      let saved = false;
      if (sharp && info.kind === 'img' && info.src && !info.src.startsWith('data:')) {
        const res = await page.request.get(info.src).catch(() => null);
        if (res?.ok()) { saved = await toPng(await res.body(), file); }
      } else if (sharp && info.kind === 'svg') {
        saved = await toPng(Buffer.from(info.svg), file);
      }
      if (!saved) { await el.screenshot({ path: file, omitBackground: true }); await trim(file); }
      c.logo = { file: `/logos/${c.id}.png`, kind: 'header', source: info.src ?? c.hp, checkedAt: today, ...((await isLight(file)) ? { tone: 'light' } : {}) };
      got++;
    } else {
      const href = await page.evaluate(() => document.querySelector('link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]')?.href);
      if (href) {
        const res = await page.request.get(href);
        if (res.ok()) { fs.writeFileSync(file, await res.body()); c.logo = { file: `/logos/${c.id}.png`, kind: 'icon', source: href, checkedAt: today }; icon++; }
        else none++;
      } else none++;
    }
  } catch { none++; }
  await page.close();
}
await browser.close();
fs.writeFileSync(F, JSON.stringify(companies, null, 2) + '\n');
console.error(`ロゴ：ヘッダーから ${got} 社／アイコン ${icon} 社／取れず ${none} 社（対象 ${targets.length} 社）`);
