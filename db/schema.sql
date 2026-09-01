-- seoul_apt 스키마 (단일 진실 소스)
-- 변경 후에는 `npm run db-reset`. 마이그레이션 파일은 두지 않는다.
--
-- 단위 규칙: 금액 = 만원 단위 정수, 면적 = ㎡ 실수.
-- 억/평 표기 변환은 src/lib/format.ts 에서만 한다.

CREATE TABLE IF NOT EXISTS complexes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  gu         TEXT NOT NULL,            -- '강남구'  ← CSV '시군구' 3토큰 중 2번째
  dong       TEXT NOT NULL,            -- '대치동'  ← 3번째
  jibun      TEXT NOT NULL,            -- '30-2'   ← CSV '번지'
  name       TEXT NOT NULL,            -- CSV '단지명' 원문 그대로 (정제하지 않는다)
  built_year INTEGER,                  -- 그 단지 거래들의 MIN(건축년도)
  -- 건축년도를 키에 넣지 않는다: 같은 단지가 1975/1976/1977 로 갈리는 케이스가 56건 있다.
  UNIQUE (gu, dong, jibun, name)
);

CREATE TABLE IF NOT EXISTS trades (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  complex_id   INTEGER NOT NULL REFERENCES complexes(id) ON DELETE CASCADE,
  deal_date    TEXT    NOT NULL,       -- 'YYYY-MM-DD'  ← 계약년월 + 계약일 병합
  price_manwon INTEGER NOT NULL,       -- '46,000' → 46000
  area_m2      REAL    NOT NULL,
  floor        INTEGER NOT NULL,       -- 음수 = 지하 (실측 범위 -1 ~ 66)
  -- 평당가 공식은 여기 한 곳에만 존재한다. 쿼리에서 다시 계산하지 않는다.
  price_per_pyeong REAL GENERATED ALWAYS AS
    (price_manwon / (area_m2 / 3.3058)) STORED
);

CREATE INDEX IF NOT EXISTS idx_trades_complex ON trades(complex_id, deal_date DESC);
CREATE INDEX IF NOT EXISTS idx_trades_date    ON trades(deal_date DESC);
CREATE INDEX IF NOT EXISTS idx_complexes_gu   ON complexes(gu);
