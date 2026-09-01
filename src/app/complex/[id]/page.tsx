import Link from "next/link";
import { notFound } from "next/navigation";

import StatCard from "@/components/StatCard";
import { formatArea, formatDate, formatFloor, formatPpy, formatPrice } from "@/lib/format";
import { getComplex, getComplexStats, listTradesByComplex } from "@/lib/queries";

export default async function ComplexPage({ params }: PageProps<"/complex/[id]">) {
  const { id } = await params;
  const complexId = Number(id);
  if (!Number.isInteger(complexId) || complexId <= 0) notFound();

  const complex = getComplex(complexId);
  const stats = getComplexStats(complexId);
  if (!complex || !stats) notFound();

  const trades = listTradesByComplex(complexId);
  const single = stats.trade_count === 1;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/" className="text-sm opacity-60 hover:underline">
          ← 목록
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{complex.name}</h1>
        <p className="mt-0.5 text-sm opacity-60">
          {complex.gu} {complex.dong} {complex.jibun}
          {complex.built_year ? ` · ${complex.built_year}년 준공` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="거래" value={`${stats.trade_count}건`} sub={`${formatDate(stats.first_date)} ~ ${formatDate(stats.last_date)}`} />
        <StatCard label="최근 거래가" value={formatPrice(stats.latest_price)} sub={formatDate(stats.last_date)} />
        <StatCard
          label={single ? "거래가" : "중앙 거래가"}
          value={formatPrice(stats.median_price)}
          sub={single ? undefined : `${formatPrice(stats.min_price)} ~ ${formatPrice(stats.max_price)}`}
        />
        <StatCard label={single ? "평당가" : "중앙 평당가"} value={`${formatPpy(stats.median_ppy)}만`} sub="만원/평" />
      </div>

      {single ? (
        <p className="rounded border border-black/10 px-3 py-2 text-xs opacity-60 dark:border-white/15">
          이 단지는 조회 기간(1년) 안에 거래가 1건뿐이다. 전체 단지의 26%가 여기 해당한다.
          한 건으로는 시세 흐름을 말할 수 없다.
        </p>
      ) : null}

      <div>
        <h2 className="mb-2 text-sm font-semibold">거래 이력 {stats.trade_count}건</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/15 text-left dark:border-white/20">
                <th className="py-2 pr-3 font-medium">계약일</th>
                <th className="py-2 pr-3 font-medium">전용면적</th>
                <th className="py-2 pr-3 font-medium">층</th>
                <th className="py-2 pr-3 text-right font-medium">거래금액</th>
                <th className="py-2 text-right font-medium">평당가</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id} className="border-b border-black/5 dark:border-white/10">
                  <td className="py-2 pr-3 whitespace-nowrap">{formatDate(t.deal_date)}</td>
                  <td className="py-2 pr-3 whitespace-nowrap opacity-70">{formatArea(t.area_m2)}</td>
                  <td className="py-2 pr-3 whitespace-nowrap opacity-70">{formatFloor(t.floor)}</td>
                  <td className="py-2 pr-3 text-right font-medium whitespace-nowrap">{formatPrice(t.price_manwon)}</td>
                  <td className="py-2 text-right whitespace-nowrap opacity-70">{formatPpy(t.price_per_pyeong)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
