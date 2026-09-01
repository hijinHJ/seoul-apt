import "server-only";

import { db } from "./db";
import type { Complex, ComplexStats, SortKey, Trade, TradeFilter, TradeRow } from "./types";

/**
 * 앱의 모든 SQL 이 이 파일에 있다.
 * 페이지와 컴포넌트는 db 를 직접 만지지 않고 여기 함수를 부른다.
 */

export const PAGE_SIZE = 50;

const listGusStmt = db.prepare(`
  SELECT gu FROM complexes GROUP BY gu ORDER BY gu
`);

/** 필터 드롭다운용 자치구 목록 (25개) */
export function listGus(): string[] {
  return (listGusStmt.all() as { gu: string }[]).map((r) => r.gu);
}

// 정렬은 사용자 입력을 SQL 에 넣는 유일한 지점이라 화이트리스트로만 매핑한다.
const ORDER_BY: Record<SortKey, string> = {
  recent: "t.deal_date DESC, t.id DESC",
  price: "t.price_manwon DESC",
  ppy: "t.price_per_pyeong DESC",
};

/** 필터가 있을 때만 WHERE 절을 붙인다. 값은 항상 바인딩한다. */
function whereClause(filter: TradeFilter): { sql: string; params: Record<string, string> } {
  if (!filter.gu) return { sql: "", params: {} };
  return { sql: "WHERE c.gu = @gu", params: { gu: filter.gu } };
}

export function searchTrades(filter: TradeFilter, page: number): TradeRow[] {
  const { sql: where, params } = whereClause(filter);
  const stmt = db.prepare(`
    SELECT t.*, c.name, c.gu, c.dong, c.built_year
      FROM trades t
      JOIN complexes c ON c.id = t.complex_id
      ${where}
     ORDER BY ${ORDER_BY[filter.sort]}
     LIMIT @limit OFFSET @offset
  `);
  return stmt.all({
    ...params,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  }) as TradeRow[];
}

export function countTrades(filter: TradeFilter): number {
  const { sql: where, params } = whereClause(filter);
  const stmt = db.prepare(`
    SELECT COUNT(*) AS n
      FROM trades t
      JOIN complexes c ON c.id = t.complex_id
      ${where}
  `);
  return (stmt.get(params) as { n: number }).n;
}

const getComplexStmt = db.prepare(`SELECT * FROM complexes WHERE id = ?`);

export function getComplex(id: number): Complex | undefined {
  return getComplexStmt.get(id) as Complex | undefined;
}

const listTradesByComplexStmt = db.prepare(`
  SELECT * FROM trades
   WHERE complex_id = ?
   ORDER BY deal_date DESC, id DESC
`);

export function listTradesByComplex(id: number): Trade[] {
  return listTradesByComplexStmt.all(id) as Trade[];
}

// SQLite 에 median() 이 없다. 윈도 함수로 가운데 행을 집는다.
// 평균을 쓰면 250억 같은 이상치에 끌려가므로 중앙값이어야 한다.
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
