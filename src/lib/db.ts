import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const DB_PATH = path.join(process.cwd(), "data", "seoul_apt.db");
const SCHEMA_PATH = path.join(process.cwd(), "db", "schema.sql");

function open(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const db = new Database(DB_PATH, { readonly: false, fileMustExist: false });
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // 스키마는 멱등(CREATE TABLE IF NOT EXISTS)이라 연결할 때마다 적용해도 안전하다.
  // 덕분에 `npm run dev` 가 별도 준비 명령 없이 한 번에 뜬다.
  db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));

  return db;
}

// dev 의 HMR 이 모듈을 다시 평가하므로 커넥션을 전역에 캐시해 핸들 누수를 막는다.
const globalForDb = globalThis as unknown as { __seoulAptDb?: Database.Database };

export const db = globalForDb.__seoulAptDb ?? open();
if (process.env.NODE_ENV !== "production") globalForDb.__seoulAptDb = db;
