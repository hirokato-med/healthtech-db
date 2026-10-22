# Healthtech DB（復刻版）

**ヘルスケア領域に特化した事業DB。** 国内ヘルステック企業の事業・サービス・人物・ニュース・解説記事を、カテゴリ（疾患／ソリューション／事業領域）でつなげて見渡せるサイトです。

2021年にアイリス株式会社の新規事業「DX Healthcare」として始まり、同年10月に Healthtech DB（healthtech-db.com）へ。2023年6月30日に一時閉鎖。本リポジトリは、当時の企業DB投入データ・カテゴリ体系・設計資料をもとに Next.js で再構築した復刻版です。経緯は [docs/HISTORY.md](docs/HISTORY.md) を参照。

```
[data/*.json, content/articles/*.md] ──next build──▶ [out/ 静的HTML] ──▶ 任意のホスティング
            ▲
            └── pipeline/news.mjs（PR TIMES 収集）／ scripts/import_companies.py（xlsx 取り込み）
```

## 構成

| パス | 役割 |
|---|---|
| `data/companies.json` | 国内企業DB（336社）。社名・カテゴリ・概要・所在地・創業年・創業者・代表者・上場区分・親会社・法人番号 |
| `data/overseas.json` | 海外企業（米国・欧州・アジア 193社） |
| `data/people.json` | 人物（創業者・代表者 409名）。企業DBから自動生成 |
| `data/services.json` | サービス・事業（手入力。`company` 名で企業に自動紐付け） |
| `data/categories.json` | カテゴリ体系（疾患／ソリューション／事業領域、42カテゴリ） |
| `data/news.json` | ニュース（`pipeline/news.mjs` が追記） |
| `data/webinars.json` | マンスリーレビューの開催履歴 |
| `data/archive-articles.json` | 旧サイトの記事題名一覧（本文復元中） |
| `content/articles/*.md` | 記事（frontmatter: slug, title, date, category, author, summary, featured, tags, companies） |
| `src/app/` | ページ。トップ／企業／サービス／人物／カテゴリ／記事／ニュース／海外／マンスリーレビュー／検索／About |
| `src/lib/data.ts` | データ読み込みと紐付け（社名のゆらぎ吸収、企業↔サービス↔人物↔ニュース） |
| `pipeline/news.mjs` | PR TIMES からヘルスケア関連リリースを収集し、企業DBに紐付けて `data/news.json` に追記 |
| `scripts/import_companies.py` | 旧「企業DB投入データ.xlsx」を JSON に変換 |
| `scripts/build-search-index.mjs` | 検索インデックス `public/search-index.json` を生成（`prebuild` で自動実行） |

## 開発

```bash
npm install
npm run dev            # http://localhost:3000
npm run build          # out/ に静的書き出し（検索インデックスも生成）
npx serve out          # 書き出し結果の確認
```

## データ更新

```bash
node pipeline/news.mjs                         # 医療 / ヘルスケア / ヘルステック で収集
node pipeline/news.mjs 医療DX オンライン診療     # 検索語を指定
python3 -I scripts/import_companies.py data/raw/companies.xlsx   # xlsx を更新したとき
```

- 企業の追加・修正は `data/companies.json` を直接編集して commit する（`id` は法人番号、無ければ `jp-NNN`）。
- サービスの追加は `data/services.json` に 1 行足す。`company` に社名を書けば企業ページに自動で出る。
- 記事の追加は `content/articles/` に Markdown を置く。`featured: true` でトップの特集に出る。`companies: [社名]` で企業ページの「紹介している記事」に出る。

## デプロイ

`next.config.ts` で `output: 'export'` にしているので、`out/` をそのまま GitHub Pages / Vercel / Cloudflare Pages / S3 に置けば動きます。
ニュースの定期更新は、GitHub Actions や Claude の定期タスクで `node pipeline/news.mjs && git commit && git push` を回す想定です（[healthbiz-news](https://github.com/hirokato-med/healthbiz-news) と同じ運用）。

## 旧サイトとの対応

| 旧 Healthtech DB | 復刻版 |
|---|---|
| `/companies/{ObjectId}` 企業ページ | `/companies/{法人番号}/` |
| `/talents/{ObjectId}` 人物ページ | `/talents/{id}/` |
| サービス情報ページ | `/services/{slug}/` |
| `/categories/{slug}/1` カテゴリページ | `/categories/{slug}/` |
| `/articles/{slug}` 記事 | `/articles/{slug}/`（復元できたものから） |
| `/writers/{slug}` 執筆者 | 記事の著者表記（執筆者ページは未実装） |
| ニュース一覧 | `/news/`（PR TIMES 自動収集） |
| 会員登録・メルマガ | Substack へのリンク（会員機能は未実装） |
| 企業・人物情報修正依頼フォーム | 旧 Google フォームへリンク |
| 管理画面 | なし。JSON / Markdown を Git で管理 |
