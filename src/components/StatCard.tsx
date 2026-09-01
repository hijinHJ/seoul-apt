export default function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded border border-black/10 px-3 py-2.5 dark:border-white/15">
      <div className="text-xs opacity-60">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
      {sub ? <div className="mt-0.5 text-xs opacity-50">{sub}</div> : null}
    </div>
  );
}
