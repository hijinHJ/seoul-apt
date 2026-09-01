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

export type SortKey = "recent" | "price" | "ppy";

export interface TradeFilter {
  gu?: string;
  sort: SortKey;
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
