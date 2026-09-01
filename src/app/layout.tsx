import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "seoul_apt — 서울 아파트 실거래가",
  description: "국토교통부 실거래가 데이터로 보는 서울 아파트 시세 (로컬 전용)",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="border-b border-black/10 dark:border-white/15">
          <div className="mx-auto max-w-6xl px-4 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              서울 아파트 실거래가
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>

        <footer className="border-t border-black/10 dark:border-white/15">
          <div className="mx-auto max-w-6xl px-4 py-4 text-xs leading-relaxed opacity-60">
            출처: 국토교통부 실거래가 공개시스템 · 서울 전체 아파트 매매 · 계약일 2025-09-02 ~ 2026-09-01
            <br />
            해제(취소) 계약 2,444건을 제외한 72,611건. 학습용 로컬 프로젝트이며 참고용으로만 활용한다.
          </div>
        </footer>
      </body>
    </html>
  );
}
