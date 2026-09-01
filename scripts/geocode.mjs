// 단지 주소 → 좌표 + 가장 가까운 지하철역. 카카오 로컬 API 를 한 번만 호출해
// db/seed/geocode.json 에 캐시한다. 이후 npm run seed 는 이 파일만 읽으므로
// 앱은 오프라인으로 동작하고 결과가 항상 재현된다.
//
//   node scripts/geocode.mjs                 캐시에 없는 단지만 처리 (중단해도 이어서 진행)
//   node scripts/geocode.mjs --retry-failed  실패로 기록된 것만 다시 시도
//   node scripts/geocode.mjs --limit 50      앞의 50개만 (키 확인용)
//
// 키는 .env.local 의 KAKAO_REST_API_KEY 에서 읽는다. .env* 는 .gitignore 에 있어
// 저장소(public)에 올라가지 않는다.
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { DB_PATH, ROOT } from "./lib/db.mjs";

const CACHE_PATH = path.join(ROOT, "db", "seed", "geocode.json");
const ENV_PATH = path.join(ROOT, ".env.local");

const args = process.argv.slice(2);
const RETRY_FAILED = args.includes("--retry-failed");
const LIMIT = (() => {
  const i = args.indexOf("--limit");
  return i >= 0 ? Number(args[i + 1]) : Infinity;
})();

// ---------- 키 ----------
function readEnvKey() {
  if (process.env.KAKAO_REST_API_KEY) return process.env.KAKAO_REST_API_KEY;
  if (!fs.existsSync(ENV_PATH)) return null;
  for (const line of fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*KAKAO_REST_API_KEY\s*=\s*(.+?)\s*$/);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  }
  return null;
}

const KEY = readEnvKey();
if (!KEY) {
  console.error(`카카오 REST API 키가 없다.

  1) https://developers.kakao.com 에서 앱을 만든다
  2) [앱 키] 탭의 REST API 키를 복사한다
  3) 프로젝트 루트에 .env.local 을 만들고 아래 줄을 넣는다

     KAKAO_REST_API_KEY=발급받은_REST_API_키

  .env.local 은 .gitignore 에 있어 저장소에 올라가지 않는다.`);
  process.exit(1);
}

// ---------- 호출 ----------
const HEADERS = { Authorization: `KakaoAK ${KEY}` };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function kakao(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.ok) return res.json();
    if (res.status === 429) { await sleep(1000 * (attempt + 1)); continue; } // 쿼터 초과
    if (res.status === 401) throw new Error("401 Unauthorized — REST API 키를 확인한다");
    if (res.status >= 500) { await sleep(500); continue; }
    throw new Error(`${res.status} ${await res.text()}`);
  }
  throw new Error("3회 재시도 실패");
}

/** 주소 → 좌표. x 가 경도, y 가 위도다(헷갈리기 쉽다). */
async function geocode(query) {
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}&size=1`;
  const doc = (await kakao(url)).documents?.[0];
  return doc ? { lat: Number(doc.y), lng: Number(doc.x) } : null;
}

/**
 * 마지막 대안: 단지명으로 장소 검색.
 * 주소로 안 잡히는 단지가 있다(예: 광진구 자양동 863 롯데캐슬리버파크시그니쳐).
 * '현대' 같은 흔한 이름이 엉뚱한 곳으로 갈 수 있어 결과가 같은 구 안인지 확인한 것만 받는다.
 */
async function searchByName(gu, name) {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(gu + " " + name)}&size=1`;
  const doc = (await kakao(url)).documents?.[0];
  if (!doc) return null;
  const addr = `${doc.address_name ?? ""} ${doc.road_address_name ?? ""}`;
  if (!addr.includes(gu)) return null; // 다른 구로 튀었으면 버린다
  return { lat: Number(doc.y), lng: Number(doc.x), by_name: true };
}

/** 좌표 → 가장 가까운 지하철역(SW8). category_name 끝에 '수도권2호선' 처럼 노선이 들어 있다. */
async function nearestStation(lat, lng) {
  const url =
    `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=SW8` +
    `&x=${lng}&y=${lat}&radius=2000&sort=distance&size=1`;
  const doc = (await kakao(url)).documents?.[0];
  if (!doc) return null;
  const line = (doc.category_name || "").split(">").pop().trim().replace(/^수도권/, ""); // '2호선'
  // place_name 은 '매봉역 3호선' 처럼 노선이 붙어 온다. 그대로 두면 배지에 노선이 두 번 나온다.
  const parts = (doc.place_name || "").split(" ");
  const station =
    parts.length > 1 && /선$/.test(parts[parts.length - 1]) ? parts.slice(0, -1).join(" ") : doc.place_name;
  return {
    station,                       // '매봉역'
    line: line || null,            // '3호선'
    distance_m: Number(doc.distance),
  };
}

// ---------- 대상 ----------
const db = new Database(DB_PATH, { readonly: true });
const rows = db
  .prepare(`SELECT gu, dong, jibun, name, road_addr FROM complexes ORDER BY gu, dong, name`)
  .all();
db.close();

const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) : {};
const keyOf = (r) => `${r.gu}\u0000${r.dong}\u0000${r.jibun}\u0000${r.name}`; // seed.mjs 와 같은 키

const todo = rows.filter((r) => {
  const hit = cache[keyOf(r)];
  if (!hit) return true;
  if (hit.failed) return RETRY_FAILED;
  return false;
}).slice(0, LIMIT);

console.log(`단지 ${rows.length.toLocaleString()}개 중 처리 대상 ${todo.length.toLocaleString()}개`);
if (todo.length === 0) { console.log("할 일이 없다."); process.exit(0); }

// ---------- 실행 ----------
let done = 0, ok = 0, failed = 0, withStation = 0;
const started = Date.now();

function save() {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0));
}

async function work(r) {
  const key = keyOf(r);
  // 도로명이 지번보다 정확도가 높다. 실패하면 지번으로 한 번 더.
  const queries = [
    r.road_addr ? `서울 ${r.gu} ${r.road_addr}` : null,
    `서울 ${r.gu} ${r.dong} ${r.jibun}`,
  ].filter(Boolean);

  let coord = null;
  for (const q of queries) {
    coord = await geocode(q);
    if (coord) break;
    await sleep(60);
  }

  // 주소 두 가지가 다 안 되면 단지명으로 찾아본다
  if (!coord) {
    await sleep(60);
    try { coord = await searchByName(r.gu, r.name); } catch { /* 여기서 실패하면 그냥 포기한다 */ }
  }

  if (!coord) {
    cache[key] = { failed: true };
    failed++;
  } else {
    await sleep(60);
    let station = null;
    try { station = await nearestStation(coord.lat, coord.lng); } catch { /* 역 정보는 없어도 된다 */ }
    cache[key] = { ...coord, ...(station ?? {}) };
    ok++;
    if (station) withStation++;
  }

  done++;
  if (done % 100 === 0) {
    save();
    const rate = done / ((Date.now() - started) / 1000);
    const eta = Math.round((todo.length - done) / rate / 60);
    process.stdout.write(`\r  ${done}/${todo.length}  성공 ${ok} 실패 ${failed}  (${rate.toFixed(1)}/s, 남은 시간 약 ${eta}분)   `);
  }
}

// 동시 5개. 카카오 무료 한도는 하루 30만 건이라 여유롭지만 예의는 지킨다.
const CONCURRENCY = 5;
const queue = [...todo];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const r = queue.shift();
      try { await work(r); }
      catch (e) { console.error(`\n  ${r.gu} ${r.name}: ${e.message}`); cache[keyOf(r)] = { failed: true }; failed++; done++; }
      await sleep(60);
    }
  })
);

save();
console.log(`\n\n완료 (${((Date.now() - started) / 1000 / 60).toFixed(1)}분)`);
console.log(`  좌표 성공  ${ok.toLocaleString()}`);
console.log(`  지하철역   ${withStation.toLocaleString()}`);
console.log(`  실패       ${failed.toLocaleString()}${failed ? "  (--retry-failed 로 재시도)" : ""}`);
console.log(`  캐시       ${CACHE_PATH}`);
console.log(`\n다음: npm run db-reset  (좌표를 DB 에 반영)`);
