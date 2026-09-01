// db/seed/*.csv (국토부 실거래가, CP949) → data/seoul_apt.db
//
//   node scripts/seed.mjs            적재
//   node scripts/seed.mjs --reset    DB 삭제 후 적재
//   node scripts/seed.mjs --dry-run  파싱만 하고 건수 출력 (DB 를 건드리지 않음)
//
// 원본 CSV 는 읽기만 한다. 절대 수정하지 않는다.
import fs from "node:fs";
import path from "node:path";
import { openDb, removeDb, ROOT } from "./lib/db.mjs";

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const RESET = args.has("--reset");
const SEED_DIR = path.join(ROOT, "db", "seed");

/** 따옴표를 존중하는 CSV 파서. 값 안에 콤마가 있으므로("46,000") split(',') 은 쓸 수 없다. */
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }  // "" → 리터럴 따옴표
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch !== "\r") field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** 파일 하나를 읽어 { 헤더명: 값 } 객체 배열로. 앞부분 안내문은 건너뛴다. */
function readCsvFile(file) {
  const text = new TextDecoder("euc-kr").decode(fs.readFileSync(file));
  const rows = parseCsv(text);
  const headerIdx = rows.findIndex((r) => r[0]?.trim() === "NO");
  if (headerIdx === -1) throw new Error(`${path.basename(file)}: 헤더('NO' 로 시작하는 줄)를 찾지 못했다`);

  const header = rows[headerIdx].map((h) => h.trim());
  return rows
    .slice(headerIdx + 1)
    .filter((r) => r[0]?.trim())
    .map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

// ---------- 읽기 ----------
const files = fs.readdirSync(SEED_DIR).filter((f) => f.toLowerCase().endsWith(".csv"));
if (files.length === 0) {
  console.error(`db/seed/ 에 CSV 가 없다. rt.molit.go.kr 에서 받아 넣는다.`);
  process.exit(1);
}

let raw = [];
for (const f of files) {
  const rows = readCsvFile(path.join(SEED_DIR, f));
  console.log(`읽음  ${f}  ${rows.length.toLocaleString()}행`);
  raw = raw.concat(rows);
}

// ---------- 거르기: 해제(취소)된 계약 ----------
const cancelled = raw.filter((r) => r["해제사유발생일"] && r["해제사유발생일"] !== "-");
const valid = raw.filter((r) => !r["해제사유발생일"] || r["해제사유발생일"] === "-");

// ---------- 변환 ----------
const complexKey = (r) => {
  const [, gu, dong] = r["시군구"].split(/\s+/);
  return `${gu}\u0000${dong}\u0000${r["번지"]}\u0000${r["단지명"]}`;
};

const complexes = new Map(); // key → { gu, dong, jibun, name, built_year }
const trades = [];           // { key, deal_date, price_manwon, area_m2, floor }
const problems = [];

for (const r of valid) {
  const parts = r["시군구"].split(/\s+/);
  if (parts.length !== 3) { problems.push(`시군구 형식: ${r["시군구"]}`); continue; }
  const [, gu, dong] = parts;

  const price = Number(r["거래금액(만원)"].replace(/,/g, ""));
  const area = Number(r["전용면적(㎡)"]);
  const floor = Number(r["층"]);
  const year = Number(r["건축년도"]);
  const ym = r["계약년월"], day = r["계약일"];

  if (!Number.isFinite(price) || !Number.isFinite(area) || area <= 0 || !Number.isFinite(floor)) {
    problems.push(`숫자 변환 실패: ${r["단지명"]} ${r["거래금액(만원)"]} / ${r["전용면적(㎡)"]} / ${r["층"]}`);
    continue;
  }
  if (!/^\d{6}$/.test(ym) || !/^\d{1,2}$/.test(day)) {
    problems.push(`날짜 형식: ${ym} ${day}`);
    continue;
  }

  const key = complexKey(r);
  const prev = complexes.get(key);
  if (!prev) {
    complexes.set(key, { gu, dong, jibun: r["번지"], name: r["단지명"], built_year: Number.isFinite(year) ? year : null });
  } else if (Number.isFinite(year) && (prev.built_year === null || year < prev.built_year)) {
    prev.built_year = year;  // 같은 단지에 건축년도가 갈리면 MIN 을 대표로
  }

  trades.push({
    key,
    deal_date: `${ym.slice(0, 4)}-${ym.slice(4, 6)}-${day.padStart(2, "0")}`,
    price_manwon: price,
    area_m2: area,
    floor,
  });
}

console.log(`\n총 원본   ${raw.length.toLocaleString()}`);
console.log(`해제 제외 ${cancelled.length.toLocaleString()}`);
console.log(`유효 거래 ${trades.length.toLocaleString()}`);
console.log(`단지      ${complexes.size.toLocaleString()}`);
if (problems.length) {
  console.log(`\n건너뛴 행 ${problems.length}건:`);
  problems.slice(0, 10).forEach((p) => console.log(`  - ${p}`));
}

if (DRY) {
  console.log("\n--dry-run: DB 를 건드리지 않고 종료한다.");
  process.exit(0);
}

// ---------- 적재 ----------
if (RESET) { removeDb(); console.log("\nDB 삭제함"); }
const db = openDb();

const insertComplex = db.prepare(`
  INSERT INTO complexes (gu, dong, jibun, name, built_year)
  VALUES (@gu, @dong, @jibun, @name, @built_year)
  ON CONFLICT (gu, dong, jibun, name) DO NOTHING
`);
const findComplex = db.prepare(`
  SELECT id FROM complexes WHERE gu = ? AND dong = ? AND jibun = ? AND name = ?
`);
const insertTrade = db.prepare(`
  INSERT INTO trades (complex_id, deal_date, price_manwon, area_m2, floor)
  VALUES (@complex_id, @deal_date, @price_manwon, @area_m2, @floor)
`);

// 7만 건이다. 건별 커밋하면 수 분 걸리므로 전체를 하나의 트랜잭션으로 묶는다.
const load = db.transaction(() => {
  const idByKey = new Map();
  for (const [key, c] of complexes) {
    insertComplex.run(c);
    idByKey.set(key, findComplex.get(c.gu, c.dong, c.jibun, c.name).id);
  }
  for (const t of trades) {
    insertTrade.run({ ...t, complex_id: idByKey.get(t.key) });
  }
});

const started = Date.now();
load();
console.log(`\n적재 완료 (${((Date.now() - started) / 1000).toFixed(1)}초)`);
console.log(`  complexes ${db.prepare("SELECT COUNT(*) n FROM complexes").get().n.toLocaleString()}`);
console.log(`  trades    ${db.prepare("SELECT COUNT(*) n FROM trades").get().n.toLocaleString()}`);
console.log(`  skipped   ${cancelled.length.toLocaleString()}`);
db.close();
