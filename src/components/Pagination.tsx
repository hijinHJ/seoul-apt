import Link from "next/link";

/** searchParams 의 page 만 바꾸는 링크. 서버 컴포넌트라 JS 없이도 동작한다. */
export default function Pagination({
  page,
  totalPages,
  params,
}: {
  page: number;
  totalPages: number;
  params: { gu?: string; sort: string };
}) {
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const q = new URLSearchParams();
    if (params.gu) q.set("gu", params.gu);
    if (params.sort !== "recent") q.set("sort", params.sort);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `/?${s}` : "/";
  };

  // 현재 페이지 주변 5개만 보여준다. 1,452 페이지를 전부 그릴 수는 없다.
  const from = Math.max(1, Math.min(page - 2, totalPages - 4));
  const to = Math.min(totalPages, from + 4);
  const pages = Array.from({ length: to - from + 1 }, (_, i) => from + i);

  const base = "rounded border px-2.5 py-1 text-sm border-black/15 dark:border-white/20";
  const muted = "opacity-30 pointer-events-none";

  return (
    <nav className="flex items-center justify-center gap-1 pt-2" aria-label="페이지">
      <Link href={href(1)} className={`${base} ${page === 1 ? muted : ""}`} aria-label="첫 페이지">
        ‹‹
      </Link>
      <Link
        href={href(page - 1)}
        className={`${base} ${page === 1 ? muted : ""}`}
        aria-label="이전 페이지"
      >
        ‹
      </Link>

      {pages.map((p) => (
        <Link
          key={p}
          href={href(p)}
          aria-current={p === page ? "page" : undefined}
          className={`${base} ${p === page ? "font-semibold bg-black/5 dark:bg-white/10" : ""}`}
        >
          {p}
        </Link>
      ))}

      <Link
        href={href(page + 1)}
        className={`${base} ${page === totalPages ? muted : ""}`}
        aria-label="다음 페이지"
      >
        ›
      </Link>
      <Link
        href={href(totalPages)}
        className={`${base} ${page === totalPages ? muted : ""}`}
        aria-label="마지막 페이지"
      >
        ››
      </Link>
    </nav>
  );
}
