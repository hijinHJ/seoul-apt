import Link from "next/link";

import { formatArea, formatDate, formatFloor, formatPpy, formatPrice } from "@/lib/format";
import type { TradeRow } from "@/lib/types";
import type { SortKey } from "@/lib/types";
import { type ListParams, sortHref } from "@/lib/urls";

/** 정렬 가능한 열. 단지명·지역은 정렬 대상이 아니다(가나다순은 이 앱에서 쓸모가 없다). */
const COLUMNS: { key?: SortKey; label: string; align?: "right" }[] = [
  { label: "단지" },
  { label: "지역" },
  { key: "area", label: "전용면적" },
  { key: "floor", label: "층" },
  { key: "date", label: "계약일" },
  { key: "price", label: "거래금액", align: "right" },
  { key: "ppy", label: "평당가", align: "right" },
];

function SortHeader({ params, col }: { params: ListParams; col: (typeof COLUMNS)[number] }) {
  const align = col.align === "right" ? "text-right" : "text-left";
  if (!col.key) return <th className={`py-2 pr-3 font-medium ${align}`}>{col.label}</th>;

  const active = params.sort === col.key;
  const arrow = active ? (params.dir === "desc" ? "▼" : "▲") : "";

  return (
    <th className={`py-2 pr-3 font-medium ${align}`} aria-sort={active ? (params.dir === "desc" ? "descending" : "ascending") : "none"}>
      <Link
        href={sortHref(params, col.key)}
        className={`inline-flex items-center gap-1 hover:underline ${active ? "" : "opacity-70"}`}
      >
        {col.label}
        <span className="text-[10px]">{arrow || "⇅"}</span>
      </Link>
    </th>
  );
}

export default function TradeTable({ rows, params }: { rows: TradeRow[]; params: ListParams }) {
  if (rows.length === 0) {
    return <p className="py-16 text-center text-sm opacity-60">조건에 맞는 거래가 없다.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/15 dark:border-white/20">
            {COLUMNS.map((c) => (
              <SortHeader key={c.label} params={params} col={c} />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-black/5 dark:border-white/10">
              <td className="py-2 pr-3">
                <Link href={`/complex/${r.complex_id}`} className="hover:underline">
                  {r.name}
                </Link>
                {r.built_year ? <span className="ml-1 text-xs opacity-50">{r.built_year}</span> : null}
              </td>
              <td className="py-2 pr-3 whitespace-nowrap opacity-70">
                {r.gu} {r.dong}
              </td>
              <td className="py-2 pr-3 whitespace-nowrap opacity-70">{formatArea(r.area_m2)}</td>
              <td className="py-2 pr-3 whitespace-nowrap opacity-70">{formatFloor(r.floor)}</td>
              <td className="py-2 pr-3 whitespace-nowrap opacity-70">{formatDate(r.deal_date)}</td>
              <td className="py-2 pr-3 text-right font-medium whitespace-nowrap">
                {formatPrice(r.price_manwon)}
              </td>
              <td className="py-2 text-right whitespace-nowrap opacity-70">
                {formatPpy(r.price_per_pyeong)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
