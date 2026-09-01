import "server-only";

import { db } from "./db";
import type { SortKey, TradeFilter, TradeRow } from "./types";

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
