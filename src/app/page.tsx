import { Suspense } from "react";

import FilterBar from "@/components/FilterBar";
import Pagination from "@/components/Pagination";
import PriceTrend from "@/components/PriceTrend";
import TradeTable from "@/components/TradeTable";
import {
  PAGE_SIZE,
  countTrades,
  incompleteMonth,
  listGus,
  monthlyTrend,
  searchTrades,
} from "@/lib/queries";
import type { SortDir, SortKey, TradeFilter } from "@/lib/types";
import { DEFAULT_DIR, DEFAULT_SORT, type ListParams } from "@/lib/urls";

const SORT_KEYS: SortKey[] = ["date", "price", "ppy", "area", "floor"];

/** searchParams 는 사용자가 손으로 고칠 수 있다. 값을 믿지 않고 전부 검증한다. */
const one = (raw: string | string[] | undefined) => (Array.isArray(raw) ? raw[0] : raw);

function parseSort(raw: string | string[] | undefined): SortKey {
  const v = one(raw);
  return v && (SORT_KEYS as string[]).includes(v) ? (v as SortKey) : DEFAULT_SORT;
}

function parseDir(raw: string | string[] | undefined): SortDir {
  return one(raw) === "asc" ? "asc" : DEFAULT_DIR;
}

function parsePage(raw: string | string[] | undefined): number {
  const n = Number(one(raw));
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;

  const gus = listGus();
  const rawGu = one(sp.gu);
  const gu = rawGu && gus.includes(rawGu) ? rawGu : undefined; // 없는 구 이름은 무시한다
  const sort = parseSort(sp.sort);
  const dir = parseDir(sp.dir);

  const filter: TradeFilter = { gu, sort, dir };
  const total = countTrades(filter);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(parsePage(sp.page), totalPages); // 범위를 넘으면 마지막 페이지

  const params: ListParams = { gu, sort, dir, page };
  const rows = searchTrades(filter, page);
  const trend = monthlyTrend(gu);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Suspense fallback={null}>
          <FilterBar gus={gus} gu={gu} />
        </Suspense>
        <p className="text-sm opacity-60">
          {gu ?? "서울 전체"} {total.toLocaleString()}건 · {page}/{totalPages} 페이지
        </p>
      </div>

      <section>
        <h2 className="mb-1 text-sm font-semibold">{gu ?? "서울 전체"} 월별 시세 흐름</h2>
        <PriceTrend data={trend} incompleteMonth={incompleteMonth()} />
      </section>

      <TradeTable rows={rows} params={params} />

      <Pagination params={params} totalPages={totalPages} />
    </div>
  );
}
