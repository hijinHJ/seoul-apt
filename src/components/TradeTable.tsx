import Link from "next/link";

import { formatArea, formatDate, formatFloor, formatPpy, formatPrice } from "@/lib/format";
import type { TradeRow } from "@/lib/types";

export default function TradeTable({ rows }: { rows: TradeRow[] }) {
  if (rows.length === 0) {
    return <p className="py-16 text-center text-sm opacity-60">조건에 맞는 거래가 없다.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/15 text-left dark:border-white/20">
            <th className="py-2 pr-3 font-medium">단지</th>
            <th className="py-2 pr-3 font-medium">지역</th>
            <th className="py-2 pr-3 font-medium">전용면적</th>
            <th className="py-2 pr-3 font-medium">층</th>
            <th className="py-2 pr-3 font-medium">계약일</th>
            <th className="py-2 pr-3 text-right font-medium">거래금액</th>
            <th className="py-2 text-right font-medium">평당가</th>
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
