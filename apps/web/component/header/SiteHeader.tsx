"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function SiteHeader() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/register" || pathname === "/") {
    return null;
  }
  return (
    <header className="border-b border-amber-100 bg-white/90">
      <nav
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4"
        aria-label="Điều hướng chính"
      >
        <Link
          href="/"
          className="text-xl font-extrabold tracking-tight text-amber-900"
        >
          BrewLite
        </Link>
        <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
          <Link
            href="/menu"
            className="rounded-lg px-3 py-2 text-stone-700 hover:bg-amber-50"
          >
            Thực đơn
          </Link>
          <Link
            href="/cart"
            className="rounded-lg px-3 py-2 text-stone-700 hover:bg-amber-50"
          >
            Giỏ hàng
          </Link>
          <Link
            href="/LichSuDonHang"
            className="rounded-lg px-3 py-2 text-stone-700 hover:bg-amber-50"
          >
            Xem lịch sử
          </Link>
          {loading ? (
            <span className="text-stone-500">Đang kiểm tra đăng nhập...</span>
          ) : user ? (
            <>
              <span
                className="max-w-48 truncate text-stone-700"
                title={user.email}
              >
                {user.email}
              </span>
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push("/");
                  router.refresh();
                }}
                className="rounded-lg border border-amber-700 px-3 py-2 text-amber-800 hover:bg-amber-50"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-amber-900 hover:bg-amber-50"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-amber-800 px-4 py-2 text-white hover:bg-amber-900"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
