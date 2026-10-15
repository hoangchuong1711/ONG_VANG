"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthError, requestPasswordReset, verifyResetOtp, resetPassword } from "@/lib/auth";

type Step = "identity" | "otp" | "password" | "done";
const messages: Record<string, string> = {
  VALIDATION_ERROR: "Thông tin chưa hợp lệ. Kiểm tra số điện thoại, email và mật khẩu.",
  INVALID_OTP: "Mã OTP không đúng, đã hết hạn hoặc đã được sử dụng.",
  INVALID_RESET_TOKEN: "Phiên đổi mật khẩu đã hết hạn. Vui lòng yêu cầu mã mới.",
  RATE_LIMITED: "Bạn thao tác quá nhanh. Vui lòng chờ rồi thử lại.",
  MAIL_UNAVAILABLE: "Dịch vụ email chưa sẵn sàng. Vui lòng thử lại sau.",
  CSRF_INVALID: "Phiên biểu mẫu đã hết hạn. Vui lòng thử lại.",
};

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("identity");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function sendCode() {
    if (!/^(0\d{9}|\+84\d{9})$/.test(phone.trim())) throw new Error("Nhập số điện thoại 10 chữ số bắt đầu bằng 0 hoặc dạng +84.");
    await requestPasswordReset(phone.trim(), email.trim());
    setOtp(""); setToken(""); setStep("otp"); setCooldown(60);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      if (step === "identity") await sendCode();
      else if (step === "otp") {
        const result = await verifyResetOtp(phone.trim(), email.trim(), otp.trim());
        setToken(result.resetToken); setStep("password");
      } else if (step === "password") {
        if (password !== confirm) throw new Error("Mật khẩu xác nhận không khớp.");
        if (password.length < 8) throw new Error("Mật khẩu cần ít nhất 8 ký tự.");
        await resetPassword(phone.trim(), email.trim(), token, password);
        setToken(""); setPassword(""); setConfirm(""); setStep("done");
      }
    } catch (failure) {
      if (failure instanceof AuthError && failure.code === "INVALID_RESET_TOKEN") { setToken(""); setStep("identity"); }
      setError(failure instanceof AuthError ? messages[failure.code] ?? "Không thể xử lý yêu cầu. Vui lòng thử lại."
        : failure instanceof Error ? failure.message : "Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally { setBusy(false); }
  }
  async function resend() {
    setError(""); setBusy(true);
    try { await sendCode(); }
    catch (failure) { setError(failure instanceof AuthError ? messages[failure.code] ?? "Không thể gửi mã. Vui lòng thử lại." : "Không thể gửi mã. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }

  return <main className="flex min-h-dvh items-center justify-center bg-amber-50 px-4 py-10 text-stone-900">
    <div className="w-full max-w-md rounded-3xl border border-amber-200 bg-white p-7 shadow-xl sm:p-9">
      <Link href="/login" className="text-sm font-bold text-amber-800">← Quay lại đăng nhập</Link>
      <h1 className="mt-6 text-3xl font-extrabold">Quên mật khẩu</h1>
      <p className="mt-2 text-sm text-stone-600">{step === "identity" ? "Nhập số điện thoại và email đã đăng ký để nhận mã OTP."
        : step === "otp" ? `Nhập mã 6 chữ số được gửi tới ${email}. Mã có hiệu lực trong 5 phút.`
        : step === "password" ? "Nhập mật khẩu mới cho tài khoản của bạn."
        : "Mật khẩu đã được thay đổi. Bạn có thể đăng nhập bằng số điện thoại."}</p>
      {step !== "done" && <form onSubmit={submit} className="mt-6 space-y-4">
        {step === "identity" && <>
          <label className="block text-sm font-semibold">Số điện thoại
            <input className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-3" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} required />
          </label>
          <label className="block text-sm font-semibold">Email
            <input className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-3" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>
        </>}
        {step === "otp" && <label className="block text-sm font-semibold">Mã OTP
          <input className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-3" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} required />
        </label>}
        {step === "password" && <>
          <label className="block text-sm font-semibold">Mật khẩu mới
            <input className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-3" type="password" autoComplete="new-password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required />
          </label>
          <label className="block text-sm font-semibold">Xác nhận mật khẩu
            <input className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-3" type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} required />
          </label>
        </>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-amber-400 px-4 py-3 font-extrabold hover:bg-amber-300 disabled:opacity-60">{busy ? "Đang xử lý..." : step === "identity" ? "Gửi mã OTP" : step === "otp" ? "Xác nhận OTP" : "Đổi mật khẩu"}</button>
        {step === "otp" && <button type="button" onClick={resend} disabled={busy || cooldown > 0} className="text-sm font-semibold text-amber-800 disabled:text-stone-400">{cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại mã OTP"}</button>}
      </form>}
      {step === "done" && <Link href="/login" className="mt-6 block rounded-xl bg-amber-400 px-4 py-3 text-center font-extrabold">Đăng nhập</Link>}
    </div>
  </main>;
}
