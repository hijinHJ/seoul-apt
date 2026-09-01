"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatPrice } from "@/lib/format";
import type { MonthPoint } from "@/lib/types";

/**
 * 월별 시세 흐름.
 *
 * 선 하나만 그리면 거짓말이 된다 — 종로구 2025-11 은 24건뿐인데 중앙값이 3,283만원/평로
 * 앞뒤 달보다 뚝 떨어진다. 실제 하락이 아니라 표본 문제다.
 * 그래서 거래건수를 막대로 함께 그려 각 점이 얼마나 믿을 만한지 보이게 한다.
 */
export default function PriceTrend({
  data,
  incompleteMonth,
}: {
  data: MonthPoint[];
  incompleteMonth: string;
}) {
  const rows = data.map((d) => ({
    ...d,
    label: d.ym.slice(2).replace("-", "."), // '2026-08' → '26.08'
  }));

  const hasIncomplete = rows.length > 0 && rows[rows.length - 1].ym === incompleteMonth;
  const lastLabel = hasIncomplete ? rows[rows.length - 1].label : null;

  return (
    <div>
      <div className="h-64 w-full">
        {/* initialDimension 이 없으면 서버 렌더에서 크기가 -1 이라 차트가 통째로 비어 나온다.
            브라우저가 실제 크기를 잴 때까지의 빈 화면과 레이아웃 이동도 이걸로 막는다. */}
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 900, height: 256 }}>
          <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} />
            <YAxis
              yAxisId="ppy"
              tick={{ fontSize: 11 }}
              stroke="currentColor"
              opacity={0.5}
              width={52}
              tickFormatter={(v: number) => `${Math.round(v / 1000)}천`}
              domain={["dataMin - 500", "dataMax + 500"]}
            />
            <YAxis
              yAxisId="count"
              orientation="right"
              tick={{ fontSize: 11 }}
              stroke="currentColor"
              opacity={0.35}
              width={40}
            />

            {/* 마지막 달은 신고 지연(계약 후 30일)으로 건수가 아직 덜 찼다 */}
            {lastLabel ? (
              <ReferenceArea
                yAxisId="ppy"
                x1={lastLabel}
                x2={lastLabel}
                fill="currentColor"
                fillOpacity={0.06}
              />
            ) : null}

            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid rgba(128,128,128,.3)",
                background: "var(--background)",
              }}
              labelFormatter={(l) => `20${l}${l === lastLabel ? " (집계 중)" : ""}`}
              formatter={(value, name) => {
                const v = Number(value);
                if (name === "median_ppy") return [`${Math.round(v).toLocaleString()}만원/평`, "중앙 평당가"];
                if (name === "count") return [`${v.toLocaleString()}건`, "거래건수"];
                return [formatPrice(v), "중앙 거래가"];
              }}
            />

            <Bar yAxisId="count" dataKey="count" fill="currentColor" fillOpacity={0.15} barSize={18} />
            <Line
              yAxisId="ppy"
              type="monotone"
              dataKey="median_ppy"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-1 text-xs opacity-50">
        선 = 중앙 평당가(만원/평), 막대 = 거래건수.
        {hasIncomplete ? " 마지막 달은 신고 기한(30일)이 남아 건수가 덜 찼다." : ""}
        {" "}건수가 적은 달은 중앙값이 크게 흔들린다.
      </p>
    </div>
  );
}
