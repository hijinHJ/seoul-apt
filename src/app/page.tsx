import { Suspense } from "react";

import FilterBar from "@/components/FilterBar";
import Pagination from "@/components/Pagination";
import TradeTable from "@/components/TradeTable";
import { PAGE_SIZE, countTrades, listGus, searchTrades } from "@/lib/queries";
import type { SortKey, TradeFilter } from "@/lib/types";

const SORT_KEYS: SortKey[] = ["recent", "price", "ppy"];

/** searchParams 는 사용자가 손으로 고칠 수 있다. 값을 믿지 않고 전부 검증한다. */
function parseSort(raw: string | string[] | undefined): SortKey {
  return typeof raw === "string" && (SORT_KEYS as string[]).includes(raw) ? (raw as SortKey) : "recent";
}

function parsePage(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;

  const gus = listGus();
  const rawGu = Array.isArray(sp.gu) ? sp.gu[0] : sp.gu;
  const gu = rawGu && gus.includes(rawGu) ? rawGu : undefined; // 없는 구 이름은 무시한다
  const sort = parseSort(sp.sort);

  const filter: TradeFilter = { gu, sort };
  const total = countTrades(filter);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(parsePage(sp.page), totalPages); // 범위를 넘으면 마지막 페이지

  const rows = searchTrades(filter, page);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Suspense fallback={null}>
          <FilterBar gus={gus} gu={gu} sort={sort} />
        </Suspense>
        <p className="text-sm opacity-60">
          {gu ?? "서울 전체"} {total.toLocaleString()}건 · {page}/{totalPages} 페이지
        </p>
      </div>

      <TradeTable rows={rows} />

      <Pagination page={page} totalPages={totalPages} params={{ gu, sort }} />
    </div>
  );
}
