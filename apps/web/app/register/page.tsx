"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/api";
import type { RegisterResponse } from "@/interface/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [tenUser, setTenUser] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (tenUser.trim().length < 2) return setError("Tên người dùng phải có ít nhất 2 ký tự.");
    if (password.length < 8) return setError("Mật khẩu phải có ít nhất 8 ký tự.");
    if (password !== confirmPassword) return setError("Mật khẩu xác nhận không khớp.");
    setSubmitting(true);
    try {
      await apiRequest<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ tenUser: tenUser.trim(), email: email.trim().toLowerCase(), password }),
      });
      router.push("/login?registered=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-amber-100 bg-white p-7 shadow-sm" aria-labelledby="register-title">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-amber-700">BrewLite · Tài khoản mới</p>
        <h1 id="register-title" className="text-3xl font-bold text-stone-900">Đăng ký</h1>
        <p className="mt-2 text-sm text-stone-600">Tạo tài khoản để bắt đầu sử dụng BrewLite.</p>
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div><label htmlFor="register-name" className="mb-1 block text-sm font-semibold">Tên người dùng</label><input id="register-name" value={tenUser} onChange={(e) => setTenUser(e.target.value)} minLength={2} maxLength={100} required autoComplete="name" className="auth-input" placeholder="Nguyễn Văn A" /></div>
          <div><label htmlFor="register-email" className="mb-1 block text-sm font-semibold">Email</label><input id="register-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="auth-input" placeholder="ban@example.com" /></div>
          <div><label htmlFor="register-password" className="mb-1 block text-sm font-semibold">Mật khẩu</label><input id="register-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" className="auth-input" placeholder="Tối thiểu 8 ký tự" /></div>
          <div><label htmlFor="register-confirm" className="mb-1 block text-sm font-semibold">Xác nhận mật khẩu</label><input id="register-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" className="auth-input" placeholder="Nhập lại mật khẩu" /></div>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button disabled={submitting} type="submit" className="w-full rounded-xl bg-amber-800 px-5 py-3 font-semibold text-white hover:bg-amber-900 disabled:opacity-60">{submitting ? "Đang đăng ký..." : "Tạo tài khoản"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-stone-600">Đã có tài khoản? <Link href="/login" className="font-semibold text-amber-800 hover:underline">Đăng nhập</Link></p>
      </section>
    </div>
  );
}
