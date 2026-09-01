import TradeTable from "@/components/TradeTable";
import { countTrades, searchTrades } from "@/lib/queries";
import type { TradeFilter } from "@/lib/types";

// Step 5: 필터 없이 최신 거래만 보여준다. 구 필터·정렬·페이지네이션은 다음 단계.
const filter: TradeFilter = { sort: "recent" };

export default function Home() {
  const rows = searchTrades(filter, 1);
  const total = countTrades(filter);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-base font-semibold">최근 실거래</h1>
        <p className="text-sm opacity-60">전체 {total.toLocaleString()}건 중 최신 {rows.length}건</p>
      </div>
      <TradeTable rows={rows} />
    </div>
  );
}
