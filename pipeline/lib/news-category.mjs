/**
 * ニュースのカテゴリ。
 * - 企業DBの会社に紐付いた（companyId がある）リリースは、その会社のカテゴリ（companies.json の categories の先頭＝主なカテゴリ）を使う。categoryBy: 'company'
 * - 紐付かないリリースは、見出しの言葉から推す。あくまで推定なので categoryBy: 'title' とし、画面では「推定」と書き、カテゴリページには出さない。
 * - 手で直したもの（categoryBy: 'review'）は上書きしない。
 * 規則は上から順に見て、最初に当たったものを使う。狭いもの（訪問看護・美容医療）を広いもの（介護・医療機関）より先に置く。
 * 「製造販売承認」「承認取得」は医薬品にも医療機器にも使うので、それだけではどちらにも決めない。
 */
export const CATEGORY_RULES = [
  ['telemedicine', /オンライン診療|遠隔診療|遠隔医療/],
  ['home-visit-nursing', /訪問看護/],
  ['medical-cosmetic', /美容医療|美容外科|美容皮膚科|美容クリニック|美容整形|アートメイク|ボツリヌス|ボトックス|ヒアルロン酸注入|スキンブースター/],
  ['electronic-health-record', /電子カルテ/],
  ['pharmacy-dx', /薬局DX|薬局向け|服薬指導|電子処方箋/],
  ['medical-image', /画像診断|読影|(?<![A-Za-z])(?:CT|MRI)(?![A-Za-z])|内視鏡/],
  ['medical-device', /医療機器|SaMD|プログラム医療機器/],
  ['personal-health-record', /PHR|健康記録|ヘルスケアアプリ|ウェアラブル/],
  ['mental-health', /メンタルヘルス|メンタル不調|うつ病|ストレスチェック/],
  ['femtech', /フェムテック|月経|妊活|不妊|更年期/],
  ['dental', /歯科|歯医者/],
  ['home-medical', /在宅医療|訪問診療/],
  ['nursing', /介護/],
  ['health-corporate-management', /健康経営|従業員の健康|産業医/],
  ['recruting-solutions', /求人|転職|人材紹介|人材派遣|採用支援/],
  ['clinical-trial-support', /治験|臨床試験/],
  ['real-world-data', /リアルワールドデータ|レセプト|医療ビッグデータ|医療データ/],
  ['medical-dx', /医療DX|医療機関向け|病院向け|クリニック向け/],
  ['simple-inspection', /検査キット|郵送検査/],
  ['pharma', /製薬|創薬|新薬|医薬品/],
];

export const guessCategory = (title) => {
  const t = (title ?? '').normalize('NFKC');
  return CATEGORY_RULES.find(([, re]) => re.test(t))?.[0] ?? null;
};

/**
 * 1本のリリースにカテゴリを付け直す（item を書き換えて返す）。
 * companiesById は id → 会社。会社のカテゴリが無いときだけ見出しから推す。
 */
export function assignNewsCategory(item, companiesById) {
  if (item.categoryBy === 'review') return item;
  const co = item.companyId ? companiesById.get(item.companyId) : null;
  const fromCompany = co?.categories?.[0] ?? null;
  if (fromCompany) {
    item.category = fromCompany;
    item.categoryBy = 'company';
    return item;
  }
  const guess = guessCategory(item.title);
  item.category = guess;
  if (guess) item.categoryBy = 'title';
  else delete item.categoryBy;
  return item;
}
