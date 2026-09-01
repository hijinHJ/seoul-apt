@AGENTS.md

# seoul_apt

서울 아파트 실거래가를 조회·분석하는 **로컬 전용 학습 프로젝트**.
배포하지 않는다. `npm run dev`로 뜨는 것이 완성 기준이다.

## v1 완료 정의 (이 3개가 되면 v1은 끝이다)

1. `npm run db-reset` 이 CSV를 읽어 **trades 72,611 / complexes 5,925** 를 출력한다
2. `/` 에서 자치구를 고르고 정렬을 바꾸며 목록을 넘길 수 있다
3. 목록의 단지명을 누르면 `/complex/[id]` 에서 그 단지 거래 이력이 보인다

**이 셋이 되면 멈춘다.** 아래 "v2 백로그"는 v1이 끝난 뒤 별도로 판단한다.

## 스택

- Next.js 16 (App Router) / React 19 / TypeScript
- Tailwind CSS v4
- SQLite (better-sqlite3) — ORM 없이 생 SQL
- 서버 컴포넌트 중심. 클라이언트 컴포넌트는 필터 바 하나뿐이다.

## 실행

```bash
npm install
npm run seed      # db/seed/*.csv → data/seoul_apt.db (최초 1회)
npm run dev       # http://localhost:3000
npm run db-reset  # DB 삭제 후 재시드
npm run db-stats  # 적재 결과 확인 (sqlite3 CLI 없이)
```

package.json scripts:

```json
{
  "dev": "next dev",
  "build": "next build",
  "lint": "eslint",
  "seed": "node scripts/seed.mjs",
  "db-reset": "node scripts/seed.mjs --reset",
  "db-stats": "node scripts/stats.mjs"
}
```

- `start`(프로덕션 서버)는 **의도적으로 없다.** 배포하지 않는다.
- `build`는 배포용이 아니라 타입·빌드 오류 확인용으로만 쓴다.
- 스크립트 이름에 콜론(`db:reset`)을 쓰지 않는다 — 권한 패턴과 어긋난다.
- **`sqlite3` CLI에 의존하지 않는다.** 이 PC에 없다. 확인은 `npm run db-stats`.

## 기능 (v1은 2개다)

1. `/` 실거래 목록 — **자치구 필터 + 정렬(최신순/가격순/평당가순) + 페이지네이션**
2. `/complex/[id]` 단지 상세 — 단지 정보, 통계(거래수·중앙가·평당가), 거래 이력 표

### v2 백로그 (v1 완료 전에는 손대지 않는다)

법정동 2단 필터, 면적대 필터, 구별 평당가 랭킹 카드, 월별 추세 SVG 차트, 단지 비교.

> 비교 기능은 담는 UI(체크박스·관심목록)가 생기기 전에는 만들지 않는다.
> URL에 id를 손으로 입력해야만 동작하는 기능은 기능이 아니다.

## 하지 않는 것

로그인, 결제, 외부 API 연동, 배포, 지도, 쓰기 기능, ORM, 전역 상태 라이브러리,
차트 라이브러리, 마이그레이션 도구, 단지명 정제, 전월세 데이터, 테스트 프레임워크.

## 데이터

국토교통부 실거래가 공개시스템(rt.molit.go.kr)에서 **수동으로 1회 받은 CSV**가
`db/seed/`에 있다. 런타임에는 외부를 호출하지 않는다.

- 범위: 서울 전체 아파트 매매, 계약일 2025-09-02 ~ 2026-09-01
- 원본 75,055건 → 해제(취소) 2,444건 제외 → **유효 72,611건 / 단지 5,925개 / 25개 구 / 317개 동**
- 인코딩 **CP949**. 앞 15줄은 안내문이고 `첫 셀이 'NO'`인 줄이 헤더다.
- 값 안에 콤마가 있으므로(`"46,000"`) **따옴표 인식 파서가 필요**하다. `split(',')` 금지.
- CSV의 `동` 컬럼은 법정동이 아니라 아파트 동번호이고 31% 비어 있다 — 쓰지 않는다.
- 기간을 넓히려면 CSV를 더 받아 `db/seed/`에 넣고 `npm run db-reset`.
  (시도별 다운로드는 1년 단위가 최대다.)

### 데이터 취급 규칙

- **`해제사유발생일`이 `-`가 아닌 행은 항상 제외한다.** 취소된 계약이다 (3.26%).
- **단지 식별 키는 `(구, 동, 번지, 단지명)`.** 건축년도를 키에 넣지 말 것 —
  같은 단지가 1975/1976/1977로 갈리는 케이스가 56건 있다. 건축년도는 `MIN()`을 대표로 쓴다.
- **평균 대신 중앙값을 쓴다.** 최고가 250억(나인원한남) 같은 이상치가 평균을 끌어올린다.
- **단지의 26%는 거래가 1건뿐이다.** 통계·그래프를 항상 그릴 수 있다고 가정하지 않는다.
- **가장 최근 달은 신고 지연으로 미완성**이다(2026-08은 다른 달의 1/4).
- 단지명은 `우공101동`, `현대(1,2차)`처럼 지저분하지만 **정제하지 않는다.**
  섣부른 통합이 서로 다른 단지를 합칠 위험이 더 크다.

## 스키마 (`db/schema.sql`)

CSV 20컬럼 중 8개만 쓴다. 버리는 것: `NO`, `본번`, `부번`, `동`, `매수자`, `매도자`,
`도로명`, `중개사소재지`, `등기일자`, `거래유형`.

```sql
CREATE TABLE IF NOT EXISTS complexes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  gu         TEXT NOT NULL,            -- '강남구'  ← '시군구' 3토큰 중 2번째
  dong       TEXT NOT NULL,            -- '대치동'  ← 3번째
  jibun      TEXT NOT NULL,            -- '30-2'   ← '번지'
  name       TEXT NOT NULL,            -- 원문 그대로
  built_year INTEGER,
  UNIQUE (gu, dong, jibun, name)
);

CREATE TABLE IF NOT EXISTS trades (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  complex_id   INTEGER NOT NULL REFERENCES complexes(id) ON DELETE CASCADE,
  deal_date    TEXT    NOT NULL,       -- 'YYYY-MM-DD' ← 계약년월+계약일 병합
  price_manwon INTEGER NOT NULL,       -- 콤마 제거한 정수
  area_m2      REAL    NOT NULL,
  floor        INTEGER NOT NULL,       -- 음수 = 지하 (실측 -1~66)
  price_per_pyeong REAL GENERATED ALWAYS AS
    (price_manwon / (area_m2 / 3.3058)) STORED
);

CREATE INDEX IF NOT EXISTS idx_trades_complex ON trades(complex_id, deal_date DESC);
CREATE INDEX IF NOT EXISTS idx_trades_date    ON trades(deal_date DESC);
CREATE INDEX IF NOT EXISTS idx_complexes_gu   ON complexes(gu);
```

## 코드 규칙

- **SQL은 `src/lib/queries.ts` 밖에 쓰지 않는다.** 페이지는 `db`를 직접 만지지 않는다.
- **파라미터는 항상 바인딩한다.** 동적 WHERE 절도 `?` / `@name` 플레이스홀더로 조립한다.
- **금액은 만원 단위 정수, 면적은 ㎡ 실수.** 억/평 변환은 `format.ts`에서만.
  평당가는 `trades.price_per_pyeong` 생성 컬럼을 쓰고 공식을 다시 쓰지 않는다.
- **스키마 변경은 `db/schema.sql` 수정 후 `npm run db-reset`.** 마이그레이션 파일 없음.
- **v1 화면이 쓰지 않는 컬럼·인덱스는 넣지 않는다.** 재시드가 1분이면 나중에 추가하면 된다.
- **필터 상태는 URL searchParams에 둔다.** 서버에서 읽어 쿼리에 넘긴다.
- **7만 행이다. 목록에는 반드시 LIMIT을 건다.** 전체 로드 금지.
- **시드는 하나의 트랜잭션으로.** 건별 커밋하면 수 분 걸린다.
- **의존성을 함부로 늘리지 않는다.** CSV 파싱과 CP949 디코딩은 Node 내장으로
  (`TextDecoder('euc-kr')`). 새 패키지가 필요하면 먼저 물어본다.

## 건드리면 안 되는 것

- `db/seed/*.csv` — 손으로 받은 13.7MB 원본. **읽기만 한다.** 수정·삭제 금지.
- `data/*.db` — 직접 편집하지 않는다. 항상 `npm run db-reset`.
- 배포 명령(`vercel`, `netlify`, `gh-pages`)은 조건상 금지다.
- 앱 코드에서의 외부 호출(`fetch`, `curl`)은 금지다.
  단, **개발 중 문서를 찾기 위한 WebSearch/WebFetch는 허용**한다 — 앱의 런타임 의존이 아니다.

## 권한 (`.claude/settings.json`)

원칙: **allow는 "이름만 봐도 결과가 정해진 명령"**(프로젝트 스크립트, 타입체크),
**deny는 "되돌리기 비싼 것"**(원본 CSV, 배포, 삭제).
`node -e`·`cat`처럼 **무엇이든 될 수 있는 명령은 어느 쪽에도 넣지 않고 매번 확인**을 받는다.

```json
{
  "permissions": {
    "deny": [
      "Edit(./db/seed/**)",
      "Edit(./data/**)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./**/*.pem)",
      "Read(./**/*.key)",
      "Bash(rm:*)",
      "Bash(git push:*)",
      "Bash(npx vercel:*)",
      "Bash(npx netlify:*)",
      "Bash(npx gh-pages:*)",
      "Bash(curl:*)",
      "PowerShell(Invoke-WebRequest*)",
      "PowerShell(Remove-Item*)"
    ],
    "allow": [
      "Bash(npm run dev:*)",
      "Bash(npm run build:*)",
      "Bash(npm run lint:*)",
      "Bash(npm run seed:*)",
      "Bash(npm run db-reset:*)",
      "Bash(npm run db-stats:*)",
      "Bash(npx tsc --noEmit:*)",
      "Bash(ls:*)"
    ]
  }
}
```

allow에 넣지 않기로 한 것과 이유:

| 제외 | 이유 |
|---|---|
| `Bash(node -e:*)` | 임의 코드 실행 = 위 deny를 **전부 우회**하는 만능 열쇠 |
| `Bash(cat:*)` | 셸 읽기는 `Read()` deny를 우회한다 |
| `Bash(sqlite3 ...)` | 이 PC에 없는 CLI. `db-stats`로 대체 |
| `Bash(npm install:*)` | "의존성 함부로 늘리지 않는다"와 충돌. 설치는 건별 승인 |

`Edit(./db/seed/**)` deny가 가장 실질적이다 — 다시 받기 번거로운 13.7MB 원본을
실수로 덮어쓰는 걸 막는다.

## 아직 없는 것

`package.json`, `db/schema.sql`, `scripts/`, `src/` 는 아직 만들지 않았다.
스캐폴딩은 다음 절차로 진행한다 (create-next-app 은 비어 있지 않은 디렉터리에서
중단될 수 있으므로 CSV를 잠시 대피시킨다):

```bash
mv db ../_seoul_apt_db_backup
npx create-next-app@latest .        # TS / Tailwind / ESLint / App Router / src-dir
mv ../_seoul_apt_db_backup db
npm i better-sqlite3 server-only && npm i -D @types/better-sqlite3
```

`AGENTS.md`는 `next dev` 최초 실행 시 자동 생성된다. 그 전까지 맨 위의
`@AGENTS.md` import 가 해석되지 않는 것은 정상이다.
