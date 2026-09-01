export interface Complex {
  id: number;
  gu: string;
  dong: string;
  jibun: string;
  name: string;
  built_year: number | null;
}

export interface Trade {
  id: number;
  complex_id: number;
  deal_date: string;        // 'YYYY-MM-DD'
  price_manwon: number;     // 만원 단위 정수
  area_m2: number;
  floor: number;            // 음수 = 지하
  price_per_pyeong: number; // 생성 컬럼
}

/** 목록 화면용: 거래 + 단지 정보 조인 결과 */
export interface TradeRow extends Trade {
  name: string;
  gu: string;
  dong: string;
  built_year: number | null;
}

export type SortKey = "date" | "price" | "ppy" | "area" | "floor";
export type SortDir = "asc" | "desc";

export interface TradeFilter {
  gu?: string;
  sort: SortKey;
  dir: SortDir;
}

/** 단지 상세 화면 통계. 거래가 1건뿐인 단지가 26% 라 항상 여러 건을 가정하면 안 된다. */
export interface ComplexStats {
  trade_count: number;
  first_date: string;
  last_date: string;
  latest_price: number;
  median_price: number;
  median_ppy: number;
  min_price: number;
  max_price: number;
}

/**
 * 월별 시세 흐름 한 점.
 * 표본이 작으면 중앙값이 크게 튄다 — 종로구 2025-11 은 24건에 3,283만원/평로
 * 앞뒤 달(4,522 / 4,230)보다 뚝 떨어진다. 실제 하락이 아니라 표본 문제다.
 * 그래서 count 를 항상 함께 넘겨 화면에서 신뢰도를 같이 보여준다.
 */
export interface MonthPoint {
  ym: string;         // 'YYYY-MM'
  count: number;
  median_ppy: number;
  median_price: number;
}
