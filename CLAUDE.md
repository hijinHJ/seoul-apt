@AGENTS.md

# seoul_apt

서울 아파트 실거래가를 조회·분석하는 **로컬 전용 학습 프로젝트**.
배포하지 않는다. `npm run dev`로 뜨는 것이 완성 기준이다.

## 말투

**반말로 대화한다.** 사용자가 요청한 방식이다.

- 설명·보고·질문 전부 반말로 한다. "~했습니다" 대신 "~했어", "~할까요?" 대신 "~할까?"
- 문서와 주석은 지금처럼 평서체(~한다)를 유지한다. 말투 규칙은 대화에만 적용된다.
- 반말이라고 대충 말하지는 않는다. 근거와 수치는 그대로 밝히고,
  안 되는 건 안 된다고, 확인 못 한 건 확인 못 했다고 분명히 말한다.

## v1 완료 정의 (이 3개가 되면 v1은 끝이다)

1. `npm run db-reset` 이 CSV를 읽어 **trades 72,611 / complexes 5,925** 를 출력한다
2. `/` 에서 자치구를 고르고 정렬을 바꾸며 목록을 넘길 수 있다
3. 목록의 단지명을 누르면 `/complex/[id]` 에서 그 단지 거래 이력이 보인다

**이 셋이 되면 멈춘다.** 아래 "v2 백로그"는 v1이 끝난 뒤 별도로 판단한다.

## 스택

- Next.js 16 (App Router) / React 19 / TypeScript
- Tailwind CSS v4
- SQLite (better-sqlite3) — ORM 없이 생 SQL
- Recharts — 월별 시세 흐름 차트
- 카카오 지도 (JS SDK) + 카카오 로컬 API (지오코딩, 1회 실행)
- 서버 컴포넌트 중심. 클라이언트 컴포넌트는 필터 바 하나뿐이다.

## 실행

```bash
npm install
npm run seed      # db/seed/*.csv → data/seoul_apt.db (최초 1회)
npm run dev       # http://localhost:3000
npm run db-reset  # DB 삭제 후 재시드
npm run db-stats  # 적재 결과 확인 (sqlite3 CLI 없이)
npm run geocode   # 단지 주소 → 좌표 + 최근접 지하철역 (최초 1회, 카카오 REST 키 필요)
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

## 기능 (v1.1)

1. `/` 실거래 목록
   - 자치구 필터, 페이지네이션
   - **표 헤더 클릭 정렬** — 면적·층·계약일·금액·평당가, 각각 오름/내림. 같은 열을 다시 누르면 방향이 뒤집힌다
   - 선택한 구(또는 서울 전체)의 **월별 시세 흐름 차트**
2. `/complex/[id]` 단지 상세 — 단지 정보, 통계, 거래 이력, **월별 시세 흐름 차트**,
   **위치 지도**와 가장 가까운 지하철역

### v2 백로그 (손대기 전에 물어본다)

법정동 2단 필터, 면적대 필터, 구별 평당가 랭킹 카드, 단지 비교.

> 비교 기능은 담는 UI(체크박스·관심목록)가 생기기 전에는 만들지 않는다.
> URL에 id를 손으로 입력해야만 동작하는 기능은 기능이 아니다.

## 하지 않는 것

로그인, 결제, 배포, 쓰기 기능, ORM, 전역 상태 라이브러리,
마이그레이션 도구, 단지명 정제, 전월세 데이터, 테스트 프레임워크.

"외부 API 연동 제외"와 "지도 제외"는 지도를 넣으면서 풀었다. 대신 아래 선을 지킨다.

## 외부 호출 정책 (지도를 넣으며 바뀐 부분)

- **좌표는 실행 중에 구하지 않는다.** `npm run geocode` 를 한 번 돌려
  `db/seed/geocode.json` 에 캐시하고, 시드가 그 파일을 읽는다. CSV 를 손으로 받는 것과 같은
  준비 작업이지 앱의 기능이 아니다. 캐시가 있으면 오프라인에서도 재현된다.
- **실행 중 남는 외부 의존은 카카오 지도 타일 하나뿐이다.** 다른 fetch 를 앱 코드에 넣지 않는다.
- **키는 `.env.local` 에만 둔다.** `.gitignore` 에 있어 공개 저장소에 올라가지 않는다.
  - `KAKAO_REST_API_KEY` — 지오코딩 스크립트 전용. 브라우저로 내보내지 않는다.
  - `NEXT_PUBLIC_KAKAO_MAP_KEY` — 지도 SDK 용. 브라우저에 노출되는 게 정상이며
    카카오 개발자 사이트에서 도메인(http://localhost:3000)으로 제한한다.
- **키가 없어도 앱은 떠야 한다.** 지도 자리에 안내 문구를 대신 보여준다.

## 데이터

국토교통부 실거래가 공개시스템(rt.molit.go.kr)에서 **수동으로 1회 받은 CSV**가
`db/seed/`에 있다.

- 범위: 서울 전체 아파트 매매, 계약일 2025-09-02 ~ 2026-09-01
- 원본 75,055건 → 해제(취소) 2,444건 제외 → **유효 72,611건 / 단지 5,925개 / 25개 구 / 317개 동**
- 인코딩 **CP949**. 앞 15줄은 안내문이고 `첫 셀이 'NO'`인 줄이 헤더다.
- 값 안에 콤마가 있으므로(`"46,000"`) **따옴표 인식 파서가 필요**하다. `split(',')` 금지.
- CSV의 `동` 컬럼은 법정동이 아니라 아파트 동번호이고 31% 비어 있다 — 쓰지 않는다.
- **CSV 에 위도·경도가 없다.** 20개 컬럼 어디에도 좌표가 없어 지오코딩이 필수다.
  주소는 `도로명`(99.9% 채워짐)이 `번지`보다 정확도가 높아 먼저 시도한다.
- **카카오 지도 API 에 지하철 전용 오버레이는 없다.** `MapTypeId` 는 ROADMAP/SKYVIEW/
  HYBRID/OVERLAY/ROADVIEW/TRAFFIC/TERRAIN/BICYCLE/BICYCLE_HYBRID/USE_DISTRICT 뿐이다.
  지하철 노선은 기본 지도 타일에 이미 그려져 나오고, 몇 호선인지는 지오코딩 때 함께 받아둔
  가장 가까운 역(SW8 카테고리)을 배지로 보여준다.
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
- **필터·정렬·페이지 상태는 URL searchParams에 둔다.** 서버에서 읽어 쿼리에 넘긴다.
  URL 조립은 `src/lib/urls.ts` 의 `listHref`/`sortHref` 만 쓴다. 손으로 쿼리스트링을 만들지 않는다.
- **정렬 컬럼과 방향은 화이트리스트로만 SQL에 들어간다.** 값을 바인딩할 수 없는 자리라
  `SORT_COLUMN`/`SORT_DIR` 를 거치지 않은 문자열은 절대 넣지 않는다.
  정렬 키 뒤에는 항상 `t.id` 를 붙인다 — 같은 값끼리 순서가 흔들리면 페이지를 넘길 때 행이 중복되거나 빠진다.
- **7만 행이다. 목록에는 반드시 LIMIT을 건다.** 전체 로드 금지.
- **시드는 하나의 트랜잭션으로.** 건별 커밋하면 수 분 걸린다.
- **차트는 Recharts 를 쓴다.** 단, `ResponsiveContainer` 는 브라우저에서 크기를 잰 뒤에야
  그리므로 **차트는 서버 렌더 결과에 나오지 않는다.** JS 없이 보여야 하는 것은 차트에 담지 않는다.
  숫자는 표와 통계 카드에도 있어야 한다.
- **시세 흐름은 반드시 거래건수와 함께 보여준다.** 표본이 작으면 중앙값이 튄다 —
  종로구 2025-11 은 24건에 3,283만원/평로 앞뒤 달(4,522 / 4,230)보다 뚝 떨어진다.
  실제 하락이 아니라 표본 문제다. 선만 그리면 거짓말이 된다.
- **거래월이 3개 미만인 단지(42%)에는 추세선을 그리지 않는다.** 점 두 개로 선을 그으면
  없는 추세를 만들어낸다.
- **의존성을 함부로 늘리지 않는다.** CSV 파싱과 CP949 디코딩은 Node 내장으로
  (`TextDecoder('euc-kr')`). 새 패키지가 필요하면 먼저 물어본다.

## 건드리면 안 되는 것

- `db/seed/*.csv` — 손으로 받은 13.7MB 원본. **읽기만 한다.** 수정·삭제 금지.
- `data/*.db` — 직접 편집하지 않는다. 항상 `npm run db-reset`.
- 배포 명령(`vercel`, `netlify`, `gh-pages`)은 조건상 금지다.
  단, **GitHub 에 소스를 올리는 것(`git push`)은 배포가 아니다** — 허용한다.
  이 저장소의 원격은 https://github.com/hijinHJ/seoul-apt (public) 이다.
- `git push --force` 는 금지다. 이미 올라간 히스토리를 덮어쓰는 일은 사람이 직접 판단한다.
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
      "Bash(git push --force:*)",
      "Bash(git push -f:*)",
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
      "Bash(git push:*)",
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
| `Bash(git push --force:*)` | deny 쪽에 둔다. 되돌리기 비싼 쪽은 push 가 아니라 force 다 |

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
