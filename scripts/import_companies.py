#!/usr/bin/env python3
"""企業DB 投入データ（xlsx）を data/*.json に変換する。

  python3 -I scripts/import_companies.py <xlsx path>

元データ: Healthtech DB（旧 DX Healthcare）の「企業DB_ DX Healthcare投入データ.xlsx」。
シート「日本」→ data/companies.json、「カテゴリ情報」→ data/categories.json（slug 補完）、
「America」「ヨーロッパ」「アジア」→ data/overseas.json、創業者・代表者 → data/people.json。
"""
import sys, json, re, hashlib
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
src = Path(sys.argv[1]) if len(sys.argv) > 1 else DATA / "raw" / "companies.xlsx"
wb = openpyxl.load_workbook(src, read_only=True, data_only=True)

def s(v):
    if v is None: return ""
    v = str(v).strip()
    if v.endswith(".0") and v[:-2].isdigit(): v = v[:-2]
    return v

def rows(ws):
    return [r for r in ws.iter_rows(values_only=True) if any(c not in (None, "") for c in r)]

# ---- カテゴリ（xlsx の 31 + 記事タイトルリストの体系で不足分を補完） ----
GROUP_JA = {"疾患": "disease", "ソリューション": "solution", "事業領域": "domain"}
cats = []
group = None
for r in rows(wb["カテゴリ情報"])[1:]:
    if s(r[0]): group = s(r[0])
    name, slug = s(r[1]), s(r[2])
    if name and slug:
        cats.append({"slug": slug, "name": name, "group": GROUP_JA[group], "groupLabel": group})
EXTRA = [
    ("ソリューション", "RWD / 医療DB", "real-world-data"),  # 同一 slug の別名は後で統合
    ("ソリューション", "医療経営支援", "medical-management-support"),
    ("ソリューション", "CRO", "cro"),
    ("ソリューション", "医薬品・医療機器卸", "wholesale"),
    ("ソリューション", "医療データ分析", "medical-data-analytics"),
    ("ソリューション", "VC・CVC", "vc-cvc"),
    ("ソリューション", "医師囲い込み", "doctor-network"),
    ("ソリューション", "マーケティング支援", "marketing-support"),
    ("事業領域", "リラクゼーション", "relaxation"),
    ("事業領域", "健康保険組合向け", "health-insuarance-market"),
    ("事業領域", "治験支援", "clinical-trial-support"),
    ("事業領域", "フィットネス", "fitness"),
    ("事業領域", "製薬・創薬", "pharma"),
]
have = {c["slug"] for c in cats}
for g, name, slug in EXTRA:
    if slug not in have:
        cats.append({"slug": slug, "name": name, "group": GROUP_JA[g], "groupLabel": g}); have.add(slug)
# 表示名のゆらぎ → slug
ALIAS = {
    "DMP/PHR": "personal-health-record", "RWD / 医療DB": "real-world-data", "RWD": "real-world-data",
    "健康保険組合向け": "health-insuarance-market",
}
name2slug = {c["name"]: c["slug"] for c in cats}
name2slug.update(ALIAS)

def cat_slugs(raw):
    out = []
    for part in re.split(r"[/、,，・]", raw):
        part = part.strip()
        if not part: continue
        slug = name2slug.get(part)
        if slug and slug not in out: out.append(slug)
    if not out and raw.strip():
        slug = name2slug.get(raw.strip())
        if slug: out.append(slug)
    return out

# ---- 国内企業 ----
companies, people = [], {}
def person_id(name):
    return "p-" + hashlib.sha1(name.encode()).hexdigest()[:8]

for i, r in enumerate(rows(wb["日本"])[1:], start=1):
    name = s(r[0])
    if not name: continue
    corp = s(r[1])
    cid = corp if re.fullmatch(r"\d{13}", corp) else f"jp-{i:03d}"
    slugs = cat_slugs(s(r[3]))
    founders = [x.strip() for x in re.split(r"[、,，/／]", s(r[9])) if x.strip()]
    reps = [x.strip() for x in re.split(r"[、,，/／]", s(r[10])) if x.strip()]
    related = [x.strip() for x in re.split(r"[、,，]", s(r[13])) if x.strip()]
    c = {
        "id": cid,
        "name": name,
        "hp": s(r[2]),
        "categories": slugs,
        "categoryLabel": s(r[3]),
        "description": s(r[4]),
        "prefecture": s(r[5]),
        "foundedYear": int(s(r[6])[:4]) if s(r[6])[:4].isdigit() else None,
        "address": s(r[7]),
        "employees": s(r[8]),
        "founders": founders,
        "representatives": reps,
        "exit": s(r[11]) or "未上場",
        "parentCompany": s(r[12]),
        "relatedCompanies": related,
        "corporateNumber": corp if re.fullmatch(r"\d{13}", corp) else "",
        "corporateNumberUrl": s(r[14]),
        "region": "JP",
        "source": "Healthtech DB 企業DB 投入データ（2021-09）",
    }
    companies.append(c)
    for n in founders:
        p = people.setdefault(n, {"id": person_id(n), "name": n, "roles": []})
        p["roles"].append({"companyId": cid, "companyName": name, "title": "創業者"})
    for n in reps:
        p = people.setdefault(n, {"id": person_id(n), "name": n, "roles": []})
        if not any(x["companyId"] == cid and x["title"] == "創業者" for x in p["roles"]):
            p["roles"].append({"companyId": cid, "companyName": name, "title": "代表者"})
        else:
            for x in p["roles"]:
                if x["companyId"] == cid: x["title"] = "創業者・代表者"

# ---- 海外企業 ----
overseas = []
def add_overseas(country, name, founded, hp, exit_, founders, note, areas, region):
    if not name: return
    overseas.append({
        "id": "ov-" + hashlib.sha1((region + name).encode()).hexdigest()[:8],
        "name": name, "country": country, "region": region,
        "foundedYear": int(founded[:4]) if founded[:4].isdigit() else None,
        "hp": hp, "exit": exit_, "founders": founders, "note": note, "areas": areas,
    })
AREA_COLS_US = ["Telemedicine","First Consultation","Online Medicine","Cancer","Security","Development tool","DMP","Insurelance","D2C","Nursing","Fitness","Medical Image","Analytics","EHR","Clinic Chain","Web Media"]
us = rows(wb["America"])
hdr = [s(x) for x in us[0]]
for r in us[1:]:
    d = dict(zip(hdr, r))
    areas = [a for a in AREA_COLS_US if s(d.get(a))]
    add_overseas("United States", s(d.get("企業名")), s(d.get("創業年")), s(d.get("HP")), s(d.get("Exit")),
                 [x.strip() for x in s(d.get("Founders")).split(",") if x.strip()], s(d.get("メモ")) or s(d.get("一言メモ")), areas, "US")
eu = rows(wb["ヨーロッパ"])
hdr = [s(x) for x in eu[0]]
for r in eu[1:]:
    d = dict(zip(hdr, r))
    add_overseas(s(d.get("国")), s(d.get("企業名")), s(d.get("創業年")), s(d.get("HP")), s(d.get("Exit")),
                 [x.strip() for x in s(d.get("Founders")).split(",") if x.strip()], s(d.get("メモ")) or s(d.get("一言メモ")), [], "EU")
asia = rows(wb["アジア"])
hdr = [s(x) for x in asia[0]]
for r in asia[1:]:
    d = dict(zip(hdr, r))
    add_overseas(s(d.get("国")), s(d.get("企業名")), s(d.get("創業年")), s(d.get("HP")), s(d.get("上場 or 未上場")),
                 [x.strip() for x in s(d.get("創業者")).split(",") if x.strip()], s(d.get("一言メモ")), [s(d.get("事業領域"))] if s(d.get("事業領域")) else [], "ASIA")

DATA.mkdir(exist_ok=True)
(DATA / "categories.json").write_text(json.dumps(cats, ensure_ascii=False, indent=2), encoding="utf-8")
(DATA / "companies.json").write_text(json.dumps(companies, ensure_ascii=False, indent=2), encoding="utf-8")
(DATA / "people.json").write_text(json.dumps(sorted(people.values(), key=lambda p: p["name"]), ensure_ascii=False, indent=2), encoding="utf-8")
(DATA / "overseas.json").write_text(json.dumps(overseas, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"categories={len(cats)} companies={len(companies)} people={len(people)} overseas={len(overseas)}")
uncat = [c["name"] for c in companies if not c["categories"]]
print("uncategorized:", uncat)
