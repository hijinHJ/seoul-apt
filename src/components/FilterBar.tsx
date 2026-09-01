"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export default function FilterBar({ gus, gu }: { gus: string[]; gu?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  /** 구를 바꾸면 항상 1페이지로 돌아간다. 55페이지에서 도봉구로 바꾸면 빈 화면이 나온다. */
  function onChange(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("gu", value);
    else params.delete("gu");
    params.delete("page");

    const query = params.toString();
    startTransition(() => router.push(query ? `/?${query}` : "/"));
  }

  return (
    <select
      aria-label="자치구"
      disabled={isPending}
      className="rounded border border-black/20 bg-transparent px-2 py-1.5 text-sm disabled:opacity-50 dark:border-white/25"
      value={gu ?? ""}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">전체 자치구</option>
      {gus.map((g) => (
        <option key={g} value={g}>
          {g}
        </option>
      ))}
    </select>
  );
}
