"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import type { SortKey } from "@/lib/types";

const SORT_LABELS: Record<SortKey, string> = {
  recent: "최신순",
  price: "거래금액 높은순",
  ppy: "평당가 높은순",
};

export default function FilterBar({ gus, gu, sort }: { gus: string[]; gu?: string; sort: SortKey }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  /** 필터를 바꾸면 항상 1페이지로 돌아간다. 3페이지에서 구를 바꾸면 빈 화면이 나올 수 있다. */
  function update(key: "gu" | "sort", value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");

    const query = params.toString();
    startTransition(() => router.push(query ? `/?${query}` : "/"));
  }

  const selectClass =
    "rounded border border-black/20 bg-transparent px-2 py-1.5 text-sm dark:border-white/25";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${isPending ? "opacity-50" : ""}`}>
      <select
        aria-label="자치구"
        className={selectClass}
        value={gu ?? ""}
        onChange={(e) => update("gu", e.target.value)}
      >
        <option value="">전체 자치구</option>
        {gus.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>

      <select
        aria-label="정렬"
        className={selectClass}
        value={sort}
        onChange={(e) => update("sort", e.target.value)}
      >
        {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
          <option key={k} value={k}>
            {SORT_LABELS[k]}
          </option>
        ))}
      </select>
    </div>
  );
}
