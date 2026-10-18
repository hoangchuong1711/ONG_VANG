"use client";

import { useCallback, useEffect, useState } from "react";
import { request } from "@/lib/api-client";
import { LogoutButton } from "./LogoutButton";

type Profile = { ma_tk: string; username: string; ho_ten: string; so_dien_thoai: string | null; email: string | null; vai_tro: string };
const roleNames: Record<string, string> = { KHACH_HANG: "Khách hàng", TAI_XE: "Tài xế", TONG_DAI: "Tổng đài", CHU_DOI_XE: "Chủ đội xe" };

export function CurrentAccountProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ hoTen: "", soDienThoai: "", email: "" });
  const [password, setPassword] = useState({ matKhauCu: "", matKhauMoi: "", xacNhan: "" });
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const value = await request<Profile>("/profile"); setProfile(value); setForm({ hoTen:value.ho_ten,soDienThoai:value.so_dien_thoai ?? "",email:value.email ?? "" }); }
    catch(e) { setProfile(null); setError(e instanceof Error ? e.message : "Không tải được hồ sơ"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const saveProfile = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { const updated=await request<Profile>("/profile","POST",{hoTen:form.hoTen,soDienThoai:form.soDienThoai || null,email:form.email || null});
      setProfile(updated); setForm({hoTen:updated.ho_ten,soDienThoai:updated.so_dien_thoai ?? "",email:updated.email ?? ""}); setNotice("Đã lưu hồ sơ."); }
    catch(e) { setError(e instanceof Error ? e.message : "Không lưu được hồ sơ"); } finally { setBusy(false); } };
  const changePassword = async (event: React.FormEvent) => { event.preventDefault(); setError(""); setNotice("");
    if (password.matKhauMoi !== password.xacNhan) { setError("Mật khẩu xác nhận chưa khớp."); return; }
    setBusy(true);
    try { await request<void>("/auth/change-password","POST",{matKhauCu:password.matKhauCu,matKhauMoi:password.matKhauMoi});
      setNotice("Đã đổi mật khẩu. Đang chuyển đến đăng nhập..."); window.setTimeout(()=>{ window.location.assign("/login"); },700); }
    catch(e) { setError(e instanceof Error ? e.message : "Không đổi được mật khẩu"); }
    finally { setBusy(false); } };
  if (loading) return <p role="status" className="mx-auto max-w-xl text-sm text-stone-600">Đang tải hồ sơ tài khoản...</p>;
  if (!profile) return <section className="mx-auto max-w-xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"><p role="alert" className="text-sm text-red-700">{error || "Không tìm thấy hồ sơ."}</p><button className="mt-4 rounded-lg border px-4 py-2 text-sm font-bold" onClick={()=>void load()}>Thử lại</button></section>;
  return <section className="mx-auto grid max-w-3xl gap-5">
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-extrabold">Hồ sơ tài khoản</h1>
      <p className="mt-2 text-sm text-stone-600">{profile.username} · {roleNames[profile.vai_tro] ?? profile.vai_tro}</p>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-700">{notice}</p>}
      <form className="mt-6 grid gap-4" onSubmit={saveProfile}>
        <div className="grid gap-1.5"><label htmlFor="profile-name" className="text-sm font-semibold">Họ và tên</label><input id="profile-name" required maxLength={100} value={form.hoTen} onChange={(e)=>setForm({...form,hoTen:e.target.value})} className="rounded-lg border border-stone-300 px-3 py-2.5" /></div>
        <div className="grid gap-1.5"><label htmlFor="profile-phone" className="text-sm font-semibold">Số điện thoại</label><input id="profile-phone" type="tel" pattern="0[0-9]{9}" title="Nhập 10 chữ số, bắt đầu bằng 0" value={form.soDienThoai} onChange={(e)=>setForm({...form,soDienThoai:e.target.value})} className="rounded-lg border border-stone-300 px-3 py-2.5" /></div>
        <div className="grid gap-1.5"><label htmlFor="profile-email" className="text-sm font-semibold">Email</label><input id="profile-email" type="email" maxLength={150} value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} className="rounded-lg border border-stone-300 px-3 py-2.5" /></div>
        <div className="flex flex-wrap gap-2"><button disabled={busy} className="rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-extrabold text-stone-950 disabled:opacity-50">Lưu hồ sơ</button><LogoutButton className="rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-bold" /></div>
      </form>
    </div>
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-extrabold">Đổi mật khẩu</h2><p className="mt-1 text-sm text-stone-600">Sau khi đổi, phiên đăng nhập hiện tại sẽ kết thúc.</p>
      <form className="mt-5 grid gap-4" onSubmit={changePassword}>
        <div className="grid gap-1.5"><label htmlFor="current-password" className="text-sm font-semibold">Mật khẩu hiện tại</label><input id="current-password" required minLength={8} type="password" autoComplete="current-password" value={password.matKhauCu} onChange={(e)=>setPassword({...password,matKhauCu:e.target.value})} className="rounded-lg border border-stone-300 px-3 py-2.5" /></div>
        <div className="grid gap-1.5"><label htmlFor="new-password" className="text-sm font-semibold">Mật khẩu mới</label><input id="new-password" required minLength={8} maxLength={72} type="password" autoComplete="new-password" value={password.matKhauMoi} onChange={(e)=>setPassword({...password,matKhauMoi:e.target.value})} className="rounded-lg border border-stone-300 px-3 py-2.5" /></div>
        <div className="grid gap-1.5"><label htmlFor="confirm-password" className="text-sm font-semibold">Nhập lại mật khẩu mới</label><input id="confirm-password" required minLength={8} maxLength={72} type="password" autoComplete="new-password" value={password.xacNhan} onChange={(e)=>setPassword({...password,xacNhan:e.target.value})} className="rounded-lg border border-stone-300 px-3 py-2.5" /></div>
        <div><button disabled={busy} className="rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-bold disabled:opacity-50">Đổi mật khẩu</button></div>
      </form>
    </div>
  </section>;
}
