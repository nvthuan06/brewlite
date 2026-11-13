"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl justify-center px-4 py-12">
      <section
        className="w-full max-w-md rounded-2xl border border-amber-100 bg-white p-7 shadow-sm"
        aria-labelledby="login-title"
      >
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-amber-700">
          BrewLite · Chào mừng quay lại
        </p>
        <h1 id="login-title" className="text-3xl font-bold text-stone-900">
          Đăng nhập
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Sử dụng email và mật khẩu của bạn.
        </p>
        {params.get("registered") === "1" && (
          <p
            role="status"
            className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-800"
          >
            Đăng ký thành công! Hãy đăng nhập để tiếp tục.
          </p>
        )}
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="mb-1 block text-sm font-semibold"
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="auth-input"
              placeholder="ban@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="login-password"
              className="mb-1 block text-sm font-semibold"
            >
              Mật khẩu
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="auth-input"
              placeholder="Mật khẩu"
            />
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          <button
            disabled={submitting}
            type="submit"
            className="w-full rounded-xl bg-amber-800 px-5 py-3 font-semibold text-white hover:bg-amber-900 disabled:opacity-60"
          >
            {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-stone-600">
          Chưa có tài khoản?{" "}
          <Link
            href="/register"
            className="font-semibold text-amber-800 hover:underline"
          >
            Đăng ký
          </Link>
        </p>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Đang tải...</div>}>
      <LoginForm />
    </Suspense>
  );
}
