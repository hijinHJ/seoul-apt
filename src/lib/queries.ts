import "server-only";

import { db } from "./db";
import type {
  Complex,
  ComplexStats,
  MonthPoint,
  SortDir,
  SortKey,
  Trade,
  TradeFilter,
  TradeRow,
} from "./types";

/**
 * 앱의 모든 SQL 이 이 파일에 있다.
 * 페이지와 컴포넌트는 db 를 직접 만지지 않고 여기 함수를 부른다.
 */

export const PAGE_SIZE = 50;

const listGusStmt = db.prepare(`SELECT gu FROM complexes GROUP BY gu ORDER BY gu`);

/** 필터 드롭다운용 자치구 목록 (25개) */
export function listGus(): string[] {
  return (listGusStmt.all() as { gu: string }[]).map((r) => r.gu);
}

// 정렬은 값을 바인딩할 수 없는 자리다. 화이트리스트가 유일한 방어선이다.
const SORT_COLUMN: Record<SortKey, string> = {
  date: "t.deal_date",
  price: "t.price_manwon",
  ppy: "t.price_per_pyeong",
  area: "t.area_m2",
  floor: "t.floor",
};
const SORT_DIR: Record<SortDir, string> = { asc: "ASC", desc: "DESC" };

function orderBy({ sort, dir }: TradeFilter): string {
  // id 를 마지막 키로 붙여 같은 값끼리도 순서가 흔들리지 않게 한다(페이지 넘길 때 중복/누락 방지).
  return `${SORT_COLUMN[sort]} ${SORT_DIR[dir]}, t.id ${SORT_DIR[dir]}`;
}

/** 필터가 있을 때만 WHERE 절을 붙인다. 값은 항상 바인딩한다. */
function whereClause(gu?: string): { sql: string; params: Record<string, string> } {
  return gu ? { sql: "WHERE c.gu = @gu", params: { gu } } : { sql: "", params: {} };
}

export function searchTrades(filter: TradeFilter, page: number): TradeRow[] {
  const { sql: where, params } = whereClause(filter.gu);
  return db
    .prepare(`
      SELECT t.*, c.name, c.gu, c.dong, c.built_year
        FROM trades t
        JOIN complexes c ON c.id = t.complex_id
        ${where}
       ORDER BY ${orderBy(filter)}
       LIMIT @limit OFFSET @offset
    `)
    .all({ ...params, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }) as TradeRow[];
}

export function countTrades(filter: TradeFilter): number {
  const { sql: where, params } = whereClause(filter.gu);
  return (
    db
      .prepare(`SELECT COUNT(*) AS n FROM trades t JOIN complexes c ON c.id = t.complex_id ${where}`)
      .get(params) as { n: number }
  ).n;
}

/**
 * 월별 시세 흐름. 평균이 아니라 중앙값을 쓴다 — 250억 같은 이상치가 평균을 끌어올린다.
 * SQLite 에 median() 이 없어 윈도 함수로 가운데 행을 집는다.
 */
export function monthlyTrend(gu?: string): MonthPoint[] {
  const { sql: where, params } = whereClause(gu);
  return db
    .prepare(`
      WITH m AS (
        SELECT strftime('%Y-%m', t.deal_date) AS ym,
               t.price_per_pyeong             AS ppy,
               t.price_manwon                 AS price,
               ROW_NUMBER() OVER (PARTITION BY strftime('%Y-%m', t.deal_date)
                                  ORDER BY t.price_per_pyeong) AS rn_ppy,
               ROW_NUMBER() OVER (PARTITION BY strftime('%Y-%m', t.deal_date)
                                  ORDER BY t.price_manwon)     AS rn_price,
               COUNT(*)     OVER (PARTITION BY strftime('%Y-%m', t.deal_date)) AS n
          FROM trades t JOIN complexes c ON c.id = t.complex_id
          ${where}
      )
      SELECT ym,
             MAX(n)                                        AS count,
             MAX(CASE WHEN rn_ppy   = (n + 1) / 2 THEN ppy   END) AS median_ppy,
             MAX(CASE WHEN rn_price = (n + 1) / 2 THEN price END) AS median_price
        FROM m
       GROUP BY ym
       ORDER BY ym
    `)
    .all(params) as MonthPoint[];
}

const getComplexStmt = db.prepare(`SELECT * FROM complexes WHERE id = ?`);

export function getComplex(id: number): Complex | undefined {
  return getComplexStmt.get(id) as Complex | undefined;
}

const listTradesByComplexStmt = db.prepare(`
  SELECT * FROM trades WHERE complex_id = ? ORDER BY deal_date DESC, id DESC
`);

export function listTradesByComplex(id: number): Trade[] {
  return listTradesByComplexStmt.all(id) as Trade[];
}

/** 단지 하나의 월별 흐름. 거래월이 3개 미만이면 화면에서 그래프를 그리지 않는다(단지의 42%). */
const monthlyByComplexStmt = db.prepare(`
  WITH m AS (
    SELECT strftime('%Y-%m', deal_date) AS ym,
           price_per_pyeong             AS ppy,
           price_manwon                 AS price,
           ROW_NUMBER() OVER (PARTITION BY strftime('%Y-%m', deal_date)
                              ORDER BY price_per_pyeong) AS rn_ppy,
           ROW_NUMBER() OVER (PARTITION BY strftime('%Y-%m', deal_date)
                              ORDER BY price_manwon)     AS rn_price,
           COUNT(*)     OVER (PARTITION BY strftime('%Y-%m', deal_date)) AS n
      FROM trades
     WHERE complex_id = ?
  )
  SELECT ym,
         MAX(n)                                              AS count,
         MAX(CASE WHEN rn_ppy   = (n + 1) / 2 THEN ppy   END) AS median_ppy,
         MAX(CASE WHEN rn_price = (n + 1) / 2 THEN price END) AS median_price
    FROM m
   GROUP BY ym
   ORDER BY ym
`);

export function monthlyByComplex(id: number): MonthPoint[] {
  return monthlyByComplexStmt.all(id) as MonthPoint[];
}

// 평균을 쓰면 250억 같은 이상치에 끌려간다. 여기도 중앙값이다.
const complexStatsStmt = db.prepare(`
  WITH t AS (
    SELECT price_manwon, price_per_pyeong, deal_date,
           ROW_NUMBER() OVER (ORDER BY price_manwon)     AS rn_price,
           ROW_NUMBER() OVER (ORDER BY price_per_pyeong) AS rn_ppy,
           COUNT(*)     OVER ()                          AS n
      FROM trades
     WHERE complex_id = @id
  )
  SELECT
    (SELECT n FROM t LIMIT 1)                                   AS trade_count,
    (SELECT MIN(deal_date) FROM t)                              AS first_date,
    (SELECT MAX(deal_date) FROM t)                              AS last_date,
    (SELECT price_manwon FROM trades
      WHERE complex_id = @id ORDER BY deal_date DESC, id DESC LIMIT 1) AS latest_price,
    (SELECT price_manwon     FROM t WHERE rn_price = (n + 1) / 2)      AS median_price,
    (SELECT price_per_pyeong FROM t WHERE rn_ppy   = (n + 1) / 2)      AS median_ppy,
    (SELECT MIN(price_manwon) FROM t)                           AS min_price,
    (SELECT MAX(price_manwon) FROM t)                           AS max_price
`);

export function getComplexStats(id: number): ComplexStats | undefined {
  const row = complexStatsStmt.get({ id }) as ComplexStats | undefined;
  return row && row.trade_count > 0 ? row : undefined;
}

/** 데이터의 마지막 달은 신고 지연으로 항상 미완성이다. 그래프에서 구분해 표시한다. */
const lastMonthStmt = db.prepare(`SELECT MAX(strftime('%Y-%m', deal_date)) AS ym FROM trades`);

export function incompleteMonth(): string {
  return (lastMonthStmt.get() as { ym: string }).ym;
}
