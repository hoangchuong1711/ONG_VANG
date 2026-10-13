"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { MapPin, PencilSimple, Plus, ShieldCheck, Trash, UserCircle, X } from "@phosphor-icons/react";
import { Navbar } from "@/components/layout/Navbar";
import { useToast } from "@/components/ui/Toast";
import { INITIAL_CUSTOMERS, INITIAL_DISCOUNTS, type AdminCustomer, type MemberDiscount } from "@/lib/admin-extras";
import { readAdminState } from "@/lib/admin-demo";
import {
  CUSTOMER_STORAGE_KEY, readCustomerDemo,
  type CustomerProfile, type CustomerAddress,
} from "@/lib/customer-demo";
import { formatVND, isValidPhone } from "@/lib/utils";

type Profile = CustomerProfile;
type Address = CustomerAddress;
type AddressDraft = Omit<Address, "id" | "isDefault">;
const tierName: Record<AdminCustomer["tier"], string> = { THUONG: "Thường", BAC: "Bạc", VANG: "Vàng" };
const fieldClass = "mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100";
const primaryClass = "rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500";
const secondaryClass = "rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100";
const subscribeToMount = () => () => {};

export default function CustomerProfilePage() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<Profile>(() => readCustomerDemo().profile);
  const [draft, setDraft] = useState<Profile>(() => readCustomerDemo().profile);
  const [addresses, setAddresses] = useState<Address[]>(() => readCustomerDemo().addresses);
  const ready = useSyncExternalStore(subscribeToMount, () => true, () => false);
  const [editProfile, setEditProfile] = useState(false);
  const [addressForm, setAddressForm] = useState(false);
  const [editAddressId, setEditAddressId] = useState<string | null>(null);
  const [addressDraft, setAddressDraft] = useState<AddressDraft>({ label: "", recipient: "", phone: "", detail: "" });
  const [passwordForm, setPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [tier] = useState<AdminCustomer["tier"]>(() =>
    readAdminState().customers.find((item) => item.id === INITIAL_CUSTOMERS[0].id)?.tier ?? "VANG");
  const [discounts] = useState<MemberDiscount[]>(() => readAdminState().discounts);
  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify({ profile, addresses })); }
    catch { /* Demo works without browser storage. */ }
  }, [ready, profile, addresses]);

  const discount = discounts.find((item) => item.tier === tier) ?? INITIAL_DISCOUNTS[0];
  const sortedAddresses = [...addresses].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = { name: draft.name.trim(), phone: draft.phone.trim(), email: draft.email.trim() };
    if (next.name.length < 2) return showToast("Vui lòng nhập họ tên đầy đủ.", "error");
    if (!isValidPhone(next.phone)) return showToast("Số điện thoại cần có 10 chữ số hợp lệ.", "error");
    if (next.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) return showToast("Email chưa đúng định dạng.", "error");
    setProfile(next);
    setEditProfile(false);
    showToast("Đã lưu hồ sơ trên trình duyệt này.");
  }

  function openAddress(address?: Address) {
    setEditAddressId(address?.id ?? null);
    setAddressDraft(address ? { label: address.label, recipient: address.recipient, phone: address.phone, detail: address.detail } :
      { label: "", recipient: profile.name, phone: profile.phone, detail: "" });
    setAddressForm(true);
  }
  function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = {
      label: addressDraft.label.trim(), recipient: addressDraft.recipient.trim(),
      phone: addressDraft.phone.trim(), detail: addressDraft.detail.trim(),
    };
    if (!next.label || !next.recipient || !next.detail) return showToast("Vui lòng điền đủ thông tin địa chỉ.", "error");
    if (!isValidPhone(next.phone)) return showToast("Số điện thoại người nhận chưa hợp lệ.", "error");
    if (editAddressId) setAddresses((items) => items.map((item) => item.id === editAddressId ? { ...item, ...next } : item));
    else setAddresses((items) => [...items, { ...next, id: crypto.randomUUID(), isDefault: items.length === 0 }]);
    setAddressForm(false);
    showToast("Đã lưu địa chỉ trên trình duyệt này.");
  }
  function removeAddress(id: string) {
    setAddresses((items) => {
      const next = items.filter((item) => item.id !== id);
      if (items.find((item) => item.id === id)?.isDefault && next.length) next[0] = { ...next[0], isDefault: true };
      return next;
    });
    showToast("Đã xóa địa chỉ.");
  }
  function previewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwords.next.length < 6) return showToast("Mật khẩu mới cần ít nhất 6 ký tự.", "error");
    if (passwords.next !== passwords.confirm) return showToast("Hai lần nhập mật khẩu mới chưa khớp.", "error");
    setPasswords({ current: "", next: "", confirm: "" });
    setPasswordForm(false);
    showToast("Bản xem trước: mật khẩu chưa được thay đổi.", "info");
  }

  if (!ready) return <div className="min-h-dvh bg-[#FAFAF9]"><Navbar /><main className="mx-auto max-w-5xl px-4 py-10 text-sm text-stone-500">Đang tải hồ sơ...</main></div>;

  return <div className="min-h-dvh bg-[#FAFAF9] text-stone-900">
    <Navbar />
    <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-7 sm:px-6 sm:py-10">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Tài khoản khách hàng</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Hồ sơ của bạn</h1>
        <p className="mt-2 text-sm text-stone-600">Quản lý thông tin liên hệ và các địa chỉ thường dùng.</p>
        <p className="mt-2 text-xs text-amber-800">Bản xem trước · Thay đổi chỉ lưu trên trình duyệt này</p>
      </header>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs sm:p-7" aria-labelledby="profile-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800"><UserCircle size={26} weight="duotone" aria-hidden="true" /></span><div><h2 id="profile-heading" className="text-lg font-bold">Thông tin cá nhân</h2><p className="text-xs text-stone-500">Mã khách hàng: KH-001</p></div></div>
          {!editProfile && <button type="button" className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-800 hover:text-amber-950" onClick={() => { setDraft(profile); setEditProfile(true); }}><PencilSimple size={17} aria-hidden="true" /> Chỉnh sửa</button>}
        </div>
        {editProfile ? <form onSubmit={saveProfile} className="mt-6 grid gap-4 border-t border-stone-100 pt-5 sm:grid-cols-2">
          <label className="text-sm font-semibold">Họ và tên<input className={fieldClass} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required maxLength={80} /></label>
          <label className="text-sm font-semibold">Số điện thoại<input className={fieldClass} value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} inputMode="tel" required maxLength={10} /></label>
          <label className="text-sm font-semibold sm:col-span-2">Email<input className={fieldClass} type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} maxLength={120} /></label>
          <div className="flex gap-2 sm:col-span-2"><button className={primaryClass} type="submit">Lưu thay đổi</button><button type="button" className={secondaryClass} onClick={() => setEditProfile(false)}>Hủy</button></div>
        </form> : <dl className="mt-6 grid gap-x-8 gap-y-5 border-t border-stone-100 pt-5 sm:grid-cols-2">
          <div><dt className="text-xs font-bold uppercase tracking-wide text-stone-500">Họ và tên</dt><dd className="mt-1 font-semibold">{profile.name}</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-wide text-stone-500">Số điện thoại</dt><dd className="mt-1 font-semibold">{profile.phone}</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-wide text-stone-500">Email</dt><dd className="mt-1 font-semibold">{profile.email || "Chưa thêm email"}</dd></div>
        </dl>}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs sm:p-7" aria-labelledby="address-heading">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="address-heading" className="text-lg font-bold">Địa chỉ giao nhận</h2><p className="mt-1 text-sm text-stone-500">Lưu các địa chỉ bạn thường dùng.</p></div><button type="button" className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-800 hover:text-amber-950" onClick={() => openAddress()}><Plus size={18} aria-hidden="true" /> Thêm địa chỉ</button></div>
        <div className="mt-5 space-y-3">{sortedAddresses.length ? sortedAddresses.map((address) => <div key={address.id} className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><MapPin size={21} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" /><div><div className="flex flex-wrap items-center gap-2"><strong>{address.label}</strong>{address.isDefault && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">Mặc định</span>}</div><p className="mt-1 text-sm text-stone-700">{address.recipient} · {address.phone}</p><p className="mt-1 text-sm leading-relaxed text-stone-600">{address.detail}</p></div></div><div className="flex gap-3 text-xs font-bold"><button type="button" className="text-stone-700 hover:text-amber-800" onClick={() => openAddress(address)}>Sửa</button><button type="button" className="text-stone-500 hover:text-red-700" onClick={() => removeAddress(address.id)} aria-label={"Xóa địa chỉ " + address.label}><Trash size={17} aria-hidden="true" /></button></div></div>
          {!address.isDefault && <button type="button" className="mt-3 text-xs font-bold text-amber-800 hover:underline" onClick={() => setAddresses((items) => items.map((item) => ({ ...item, isDefault: item.id === address.id })))}>Đặt làm mặc định</button>}
        </div>) : <p className="rounded-xl border border-dashed border-stone-300 p-5 text-sm text-stone-500">Bạn chưa lưu địa chỉ nào.</p>}</div>
        {addressForm && <form onSubmit={saveAddress} className="mt-5 grid gap-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4 sm:grid-cols-2">
          <div className="flex items-center justify-between sm:col-span-2"><h3 className="font-bold">{editAddressId ? "Sửa địa chỉ" : "Thêm địa chỉ"}</h3><button type="button" onClick={() => setAddressForm(false)} aria-label="Đóng biểu mẫu địa chỉ"><X size={19} /></button></div>
          <label className="text-sm font-semibold">Tên gợi nhớ<input className={fieldClass} placeholder="Nhà riêng, Công ty..." value={addressDraft.label} onChange={(event) => setAddressDraft({ ...addressDraft, label: event.target.value })} required maxLength={40} /></label>
          <label className="text-sm font-semibold">Người nhận<input className={fieldClass} value={addressDraft.recipient} onChange={(event) => setAddressDraft({ ...addressDraft, recipient: event.target.value })} required maxLength={80} /></label>
          <label className="text-sm font-semibold">Số điện thoại<input className={fieldClass} inputMode="tel" value={addressDraft.phone} onChange={(event) => setAddressDraft({ ...addressDraft, phone: event.target.value })} required maxLength={10} /></label>
          <label className="text-sm font-semibold sm:col-span-2">Địa chỉ đầy đủ<textarea className={fieldClass} rows={2} value={addressDraft.detail} onChange={(event) => setAddressDraft({ ...addressDraft, detail: event.target.value })} required maxLength={240} /></label>
          <button className={primaryClass + " w-fit sm:col-span-2"} type="submit">Lưu địa chỉ</button>
        </form>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-amber-200 bg-[#FEF7E5] p-5 sm:p-7" aria-labelledby="membership-heading">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">Quyền lợi thành viên</p>
        <h2 id="membership-heading" className="mt-2 text-2xl font-extrabold">Hạng {tierName[tier]}</h2>
        <p className="mt-2 text-sm text-stone-700">{discount.percent ? "Giảm " + discount.percent + "% cước, tối đa " + formatVND(discount.maxDiscount) + " mỗi đơn theo cấu hình demo." : "Hạng hiện tại chưa có ưu đãi giảm cước trong cấu hình demo."}</p>
        <div className="mt-6 grid gap-2 border-t border-amber-200 pt-5 sm:grid-cols-3">{discounts.map((item) => <div key={item.tier} className={"rounded-xl p-3 text-sm " + (item.tier === tier ? "bg-stone-900 text-white" : "bg-white/80 text-stone-800")}><strong>Hạng {tierName[item.tier]}</strong><p className={"mt-1 text-xs " + (item.tier === tier ? "text-stone-300" : "text-stone-600")}>{item.percent ? "Giảm " + item.percent + "%, tối đa " + formatVND(item.maxDiscount) : "Chưa có giảm cước"}</p></div>)}</div>
        <p className="mt-4 text-xs leading-relaxed text-amber-950/75">Điểm tích lũy và điều kiện lên hạng chưa được cấu hình, nên chưa có số điểm để theo dõi. Hạng thành viên hiện được cập nhật trong dữ liệu quản trị demo.</p>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs sm:p-7" aria-labelledby="security-heading">
        <div className="flex items-center gap-3"><ShieldCheck size={26} className="text-stone-700" aria-hidden="true" /><div><h2 id="security-heading" className="text-lg font-bold">Bảo mật tài khoản</h2><p className="text-sm text-stone-500">Quản lý mật khẩu và phiên đăng nhập.</p></div></div>
        <div className="mt-5 flex flex-wrap gap-3 border-t border-stone-100 pt-5"><button type="button" className={primaryClass} onClick={() => setPasswordForm(true)}>Đổi mật khẩu</button><Link href="/login" className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50">Đổi tài khoản</Link></div>
        <p className="mt-3 text-xs text-stone-500">Tài khoản đang ở chế độ demo. Đổi mật khẩu và đăng xuất thực cần kết nối hệ thống đăng nhập.</p>
      </section>
    </main>

    {passwordForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPasswordForm(false); }}><form onSubmit={previewPassword} role="dialog" aria-modal="true" aria-labelledby="password-heading" className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
      <div className="flex items-start justify-between gap-3"><div><h2 id="password-heading" className="text-lg font-bold">Đổi mật khẩu</h2><p className="mt-1 text-xs text-stone-500">Bản xem trước; không nhập mật khẩu thật. Thao tác này chưa cập nhật tài khoản.</p></div><button type="button" onClick={() => setPasswordForm(false)} aria-label="Đóng"><X size={20} /></button></div>
      <label className="block text-sm font-semibold">Mật khẩu hiện tại<input className={fieldClass} type="password" autoComplete="current-password" value={passwords.current} onChange={(event) => setPasswords({ ...passwords, current: event.target.value })} required /></label>
      <label className="block text-sm font-semibold">Mật khẩu mới<input className={fieldClass} type="password" autoComplete="new-password" value={passwords.next} onChange={(event) => setPasswords({ ...passwords, next: event.target.value })} required minLength={6} /></label>
      <label className="block text-sm font-semibold">Nhập lại mật khẩu mới<input className={fieldClass} type="password" autoComplete="new-password" value={passwords.confirm} onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })} required /></label>
      <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setPasswordForm(false)} className={secondaryClass}>Hủy</button><button type="submit" className={primaryClass}>Xem thử xác nhận</button></div>
    </form></div>}
  </div>;
}
