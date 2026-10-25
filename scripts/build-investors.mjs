#!/usr/bin/env node
/**
 * 資金調達の引受先の名前をそろえ、投資家（VC・事業会社など）の一覧 data/investors.json を作る。
 *
 *   node scripts/build-investors.mjs           # 作り直す（手で直した種類・別名は data/investor-aliases.json に置く）
 *   node scripts/build-investors.mjs --report  # そろえ方の確認用に、元の名前と寄せ先を出す
 *
 * - ファンド名（「〇〇2号投資事業有限責任組合」など）は運用会社にまとめる。かっこ内に運用会社が書いてあればそれを使う。
 * - 融資（日本政策金融公庫など）と「個人投資家」「エンジェル投資家」のような名前のない引受先は除く。
 * - 種類：独立系VC／金融機関系VC／大学系VC／政府系・公的／事業会社（CVC含む）／個人／その他。
 *   data/investor-aliases.json の { aliases: { 元の名前: 寄せ先 }, types: { 寄せ先: 種類 }, exclude: [...] } が優先。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (f) => path.join(ROOT, 'data', f);
const read = (f) => JSON.parse(fs.readFileSync(P(f), 'utf8'));
const fundings = read('fundings.json');
const companies = read('companies.json');
const manual = fs.existsSync(P('investor-aliases.json')) ? read('investor-aliases.json') : { aliases: {}, types: {}, exclude: [] };

const LEGAL = /株式会社|合同会社|有限会社|一般社団法人|一般財団法人|公益財団法人|相互会社|有限責任事業組合|\(株\)|㈱/g;
const FUND = /(?:第?\s*[0-9]+\s*号)?\s*(?:投資事業有限責任組合|投資事業組合|ファンド|Fund|LPS|L\.P\.)(?:\s*by\s*.+)?$/i;
const key = (s) => s.normalize('NFKC').replace(LEGAL, '').replace(/[\s・･.,、]/g, '').toLowerCase();

/** 引受先の名前1つを、まとめ先の名前にする。除くものは null */
function canon(raw) {
  let s = raw.normalize('NFKC').trim();
  if (s in manual.aliases) return manual.aliases[s];
  if (/融資|借入|ローン/.test(s)) return null;
  if (/^(個人投資家|エンジェル投資家|既存株主|既存投資家|個人株主|個人$|その他|複数の個人|非公開|事業会社|金融機関|ほか)/.test(s)) return null;
  if (/日本政策金融公庫|商工組合中央金庫|信用保証/.test(s)) return null;
  const inner = (s.match(/[（(]([^）)]+)[)）]/) ?? [])[1];
  let outer = s.replace(/[（(][^）)]*[)）]/g, '').trim();
  // ファンド名の後ろのかっこに運用会社が書いてあれば、それを使う（「OUVC2号投資事業有限責任組合（大阪大学ベンチャーキャピタル）」）
  if (inner && FUND.test(outer) && !/号|組合|運営$/.test(inner.replace(/(が)?運営.*$/, ''))) outer = inner.replace(/(が)?運営.*$/, '').split(/[・、]/)[0];
  outer = outer.replace(LEGAL, '').trim();
  // 「〇〇2号投資事業有限責任組合」「〇〇3号ファンド」は運用会社名へ。「インキュベイトファンド」のような社名はそのまま
  if (/号|投資事業有限責任組合|投資事業組合|LPS|L\.P\./.test(outer)) outer = outer.replace(FUND, '').replace(/第?[0-9]+号.*$/, '').trim();
  outer = outer.replace(/\s+by\s+.+$/i, '').trim();
  if (outer in manual.aliases) return manual.aliases[outer];
  return outer || null;
}

const coKeys = new Map(companies.map((c) => [key(c.name), c]));
function guessType(name, raws = []) {
  // 元の名前に「株式会社」などがあれば法人。人の名前には付かない
  const corp = raws.some((r) => /株式会社|合同会社|有限会社|法人|\(株\)|Inc|LLC|Ltd|Corp/i.test(r));
  if (manual.types[name]) return manual.types[name];
  if (/大学|UTEC|OUVC|THVP|慶應イノベーション|東京大学協創|京都大学イノベーション|東北大学ベンチャー|名古屋大学|九州大学|大阪大学|広島大学|筑波|東京工業大学|早稲田/.test(name)) return '大学系VC';
  if (/産業革新|JIC|INCJ|DBJ|日本政策投資銀行|中小企業基盤整備機構|中小機構|REVIC|地域経済活性化|東京都|官民|科学技術振興機構|JST|産業技術総合研究所|AMED|NEDO|市スタートアップ|県/.test(name)) return '政府系・公的';
  if (/新生企業投資|SMBC|三菱UFJ|MUFG|みずほ|りそな|SBI|大和|野村|ニッセイ|三井住友|東京海上|損保|第一生命|明治安田|住友生命|日本生命|信金|信用金庫|銀行|キャピタルパートナーズ$|FFG|ふくおか|常陽|ちゅうぎん|静銀|しんきん|ほくほく|池田泉州|京銀|広銀|山銀|七十七|名古屋|中銀|東海東京|岡三|みらい創造|SMBC日興|かんぽ|T&D/.test(name)) return '金融機関系VC';
  const co = coKeys.get(key(name));
  if (co && !/キャピタル|ベンチャーズ|Ventures|Capital|パートナーズ|Partners|インベストメント|Investment/i.test(name)) return '事業会社（CVC含む）';
  if (/CVC|Innovation Fund|イノベーション|ベンチャーズ$/.test(name) && /ソニー|Sony|パラマウント|PARAMOUNT|MEDIPAL|メディパル|オムロン|ニプロ|テルモ|富士|NTT|KDDI|ドコモ|伊藤忠|三井物産|三菱商事|住友商事|丸紅|双日|セコム|ALSOK|SOMPO|積水|塩野義|武田|アステラス|第一三共|大塚|エーザイ|中外|小野|協和|参天|ロート|ツムラ|カゴメ|味の素|日清|明治|森永|キリン|アサヒ|サントリー|ヤクルト|花王|資生堂|ライオン|ユニ・チャーム|東レ|帝人|旭化成|三井化学|JSR|コニカ|キヤノン|日立|東芝|パナソニック|シャープ|京セラ|村田|TDK|デンソー|トヨタ|ホンダ|ヤマハ|リクルート|楽天|LINE|ヤフー|サイバーエージェント|DeNA|GREE|ミクシィ|MIXI|ZOZO|メルカリ|エムスリー|ベネッセ|博報堂|電通|凸版|大日本印刷|TOPPAN|DNP/.test(name)) return '事業会社（CVC含む）';
  if (/キャピタル|ベンチャーズ|Ventures|Capital|パートナーズ|Partners|インベストメント|Investment|ファンド|Fund|インキュベ|Incubat|アクセラレ|ANRI|Coral|DCM|WiL|Globis|グロービス|ジャフコ|JAFCO|Beyond Next|Eight Roads|Spiral|STRIVE|DNX|Archetype|グローバル・ブレイン|Global Brain|East Ventures|Genesia|ジェネシア|XTech|Mistletoe|千葉道場|ファストトラック|MPower|One Capital|W ventures|Delta|UntroD|リアルテック|ニッセイ|Angel Bridge/i.test(name)) return '独立系VC';
  if (co) return '事業会社（CVC含む）';
  if (!corp && /^[一-龥]{1,4}\s?[一-龥ぁ-ん]{1,4}(氏)?$/.test(name) && !/製薬|薬品|工業|電機|商事|物産|ホールディングス|グループ|病院|クリニック|医療|ヘルス|メディカル|システム|ソリューション|研究所|協会|機構|財団|大学|銀行|証券|保険|生命|社/.test(name)) return '個人';
  return '事業会社（CVC含む）';
}

// 集計
const inv = new Map();
const mapping = {};
for (const [companyId, f] of Object.entries(fundings)) {
  for (const r of f.rounds ?? []) {
    if (r.round === 'M&A' || r.type === '融資（デット）') continue;
    const names = new Set();
    // 同じ回のほかの引受先（名前のない「個人投資家」なども、そのまま出す。融資は除く）
    const all = [];
    for (const raw of r.investors ?? []) {
      const c = canon(raw);
      mapping[raw] = c;
      if (c && !(manual.exclude ?? []).includes(c)) { names.add(c); all.push(c); }
      else if (!/融資|借入|ローン|日本政策金融公庫|商工組合中央金庫|信用保証/.test(raw)) all.push(raw.normalize('NFKC').replace(/[（(].*?[)）]/g, '').trim());
    }
    const leadC = r.lead ? canon(r.lead) : null;
    for (const n of names) {
      const k = key(n);
      const e = inv.get(k) ?? { name: n, names: new Set(), rounds: [] };
      e.names.add(n);
      e.rounds.push({ companyId, date: r.date, round: r.round, type: r.type, amount: r.amount ?? null, lead: !!leadC && key(leadC) === k, with: [...new Set(all.filter((x) => key(x) !== k))], source: r.source });
      inv.set(k, e);
    }
  }
}
const slug = (s) => 'i-' + [...s.normalize('NFKC')].reduce((h, ch) => (h * 31 + ch.codePointAt(0)) >>> 0, 7).toString(36);
const out = [...inv.values()].map((e) => {
  const name = [...e.names].sort((a, b) => e.rounds.filter((r) => r).length && b.length - a.length)[0];
  return {
    id: slug(key(name)), name, type: guessType(name, Object.keys(mapping).filter((raw) => mapping[raw] && key(mapping[raw]) === key(name))),
    aliases: Object.entries(mapping).filter(([raw, c]) => c && key(c) === key(name) && raw !== name).map(([raw]) => raw).sort(),
    companies: new Set(e.rounds.map((r) => r.companyId)).size,
    rounds: e.rounds.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')),
  };
}).sort((a, b) => b.companies - a.companies || a.name.localeCompare(b.name));

if (process.argv.includes('--report')) {
  const byType = {};
  for (const i of out) byType[i.type] = (byType[i.type] ?? 0) + 1;
  console.log('投資家', out.length, '（2社以上', out.filter((i) => i.companies >= 2).length, '）', byType);
  for (const i of out.slice(0, Number(process.argv[3] ?? 60))) console.log(`${i.companies}\t${i.type}\t${i.name}\t← ${i.aliases.slice(0, 4).join(' | ')}`);
} else {
  fs.writeFileSync(P('investors.json'), JSON.stringify(out, null, 1) + '\n');
  console.error(`投資家 ${out.length} 件（2社以上に投資 ${out.filter((i) => i.companies >= 2).length} 件）を data/investors.json に書き出し`);
}
