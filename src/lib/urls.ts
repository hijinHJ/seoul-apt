import type { SortDir, SortKey } from "./types";

export interface ListParams {
  gu?: string;
  sort: SortKey;
  dir: SortDir;
  page: number;
}

export const DEFAULT_SORT: SortKey = "date";
export const DEFAULT_DIR: SortDir = "desc";

/**
 * 목록 화면 URL 을 만드는 유일한 함수.
 * 기본값은 쿼리에서 빼서 주소를 짧게 유지한다 — '/' 와 '/?sort=date&dir=desc&page=1' 은 같은 화면이다.
 */
export function listHref(p: ListParams): string {
  const q = new URLSearchParams();
  if (p.gu) q.set("gu", p.gu);
  if (p.sort !== DEFAULT_SORT) q.set("sort", p.sort);
  if (p.dir !== DEFAULT_DIR) q.set("dir", p.dir);
  if (p.page > 1) q.set("page", String(p.page));
  const s = q.toString();
  return s ? `/?${s}` : "/";
}

/**
 * 헤더를 눌렀을 때 갈 곳.
 * 다른 열이면 그 열의 기본 방향(내림)으로, 같은 열이면 방향만 뒤집는다.
 * 정렬이 바뀌면 1페이지로 돌아간다.
 */
export function sortHref(current: ListParams, key: SortKey): string {
  const dir: SortDir = current.sort === key && current.dir === "desc" ? "asc" : "desc";
  return listHref({ ...current, sort: key, dir, page: 1 });
}
