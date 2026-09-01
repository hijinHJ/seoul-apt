// 스크립트(seed/stats)용 DB 오픈.
// 앱 쪽은 src/lib/db.ts 가 따로 있다 — 스키마 파일은 db/schema.sql 하나를 공유한다.
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export const ROOT = path.resolve(import.meta.dirname, "..", "..");
export const DB_PATH = path.join(ROOT, "data", "seoul_apt.db");
const SCHEMA_PATH = path.join(ROOT, "db", "schema.sql");

export function openDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(fs.readFileSync(SCHEMA_PATH, "utf8")); // 멱등 DDL
  return db;
}

export function removeDb() {
  for (const suffix of ["", "-wal", "-shm"]) {
    fs.rmSync(DB_PATH + suffix, { force: true });
  }
}
