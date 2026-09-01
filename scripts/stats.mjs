// 적재 결과 확인. 이 PC에 sqlite3 CLI 가 없어서 이 스크립트가 그 역할을 한다.
import { openDb, DB_PATH } from "./lib/db.mjs";

const db = openDb();
const one = (sql) => db.prepare(sql).get();

const c = one("SELECT COUNT(*) n FROM complexes").n;
const t = one("SELECT COUNT(*) n FROM trades").n;

console.log(`DB        ${DB_PATH}`);
console.log(`complexes ${c.toLocaleString()}`);
console.log(`trades    ${t.toLocaleString()}`);

if (t === 0) {
  console.log("\n비어 있다. `npm run seed` 로 적재한다.");
} else {
  const r = one(`SELECT MIN(deal_date) lo, MAX(deal_date) hi FROM trades`);
  const gu = one(`SELECT COUNT(DISTINCT gu) n FROM complexes`).n;
  const dong = one(`SELECT COUNT(DISTINCT gu || dong) n FROM complexes`).n;
  console.log(`기간      ${r.lo} ~ ${r.hi}`);
  console.log(`지역      ${gu}개 구 / ${dong}개 동`);

  // 중앙값: SQLite 에 median() 이 없으므로 윈도 함수로 가운데 행을 집는다.
  const rows = db.prepare(`
    WITH ranked AS (
      SELECT c.gu                                                              AS gu,
             t.price_per_pyeong                                                AS ppy,
             ROW_NUMBER() OVER (PARTITION BY c.gu ORDER BY t.price_per_pyeong) AS rn,
             COUNT(*)     OVER (PARTITION BY c.gu)                             AS n
        FROM trades t JOIN complexes c ON c.id = t.complex_id
    )
    SELECT gu, n, ppy AS med
      FROM ranked
     WHERE rn = (n + 1) / 2
     ORDER BY med DESC
  `).all();

  console.log("\n자치구별 평당가 중앙값:");
  for (const x of rows) {
    console.log(`  ${x.gu.padEnd(7)} ${String(x.n).padStart(6)}건  ${Math.round(x.med).toLocaleString().padStart(7)}만원/평`);
  }
}
db.close();
