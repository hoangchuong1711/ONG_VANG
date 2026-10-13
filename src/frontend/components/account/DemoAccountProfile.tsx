"use client";

import { useState, type FormEvent } from "react";

type EditableFields = {
  fullName: string;
  phone: string;
  email: string;
};

type Profile = EditableFields & {
  accountId: string;
  role: string;
  joinedAt: string;
  initials: string;
};

type FieldErrors = Partial<Record<keyof EditableFields, string>>;

export function DemoAccountProfile({ profile, area }: { profile: Profile; area: "dispatcher" | "admin" }) {
  const [saved, setSaved] = useState<EditableFields>({
    fullName: profile.fullName,
    phone: profile.phone,
    email: profile.email,
  });
  const [draft, setDraft] = useState<EditableFields>(saved);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState("");
  const fieldId = `${area}-profile`;

  const startEditing = () => {
    setDraft(saved);
    setErrors({});
    setNotice("");
    setEditing(true);
  };

  const cancelEditing = () => {
    setDraft(saved);
    setErrors({});
    setEditing(false);
  };

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: FieldErrors = {};
    const fullName = draft.fullName.trim();
    const phone = draft.phone.trim();
    const email = draft.email.trim();

    if (fullName.length < 2) nextErrors.fullName = "Vui lòng nhập họ tên có ít nhất 2 ký tự.";
    if (!/^0\d{9}$/.test(phone)) nextErrors.phone = "Số điện thoại cần có 10 chữ số và bắt đầu bằng 0.";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Email chưa đúng định dạng.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const updated = { fullName, phone, email };
    setSaved(updated);
    setDraft(updated);
    setEditing(false);
    setNotice("Đã cập nhật bản xem trước. Dữ liệu sẽ trở về mẫu khi tải lại trang.");
  };

  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3.5 text-sm text-stone-950 outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-200";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8 text-stone-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold text-amber-700">Tài khoản vận hành</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Hồ sơ tài khoản</h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">Xem thông tin cá nhân và vai trò đang dùng trong hệ thống.</p>
        </div>
        <span className="w-fit rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900">Dữ liệu demo</span>
      </div>

      {notice && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">{notice}</p>}

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm" aria-label="Thông tin tài khoản">
        <div className="flex flex-col gap-5 border-b border-stone-200 bg-amber-50/70 px-5 py-6 sm:flex-row sm:items-center sm:px-7">
          <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-xl font-black text-stone-950">{profile.initials}</span>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-xl font-extrabold sm:text-2xl">{saved.fullName}</h2>
            <p className="mt-1 text-sm font-semibold text-stone-600">{profile.role}</p>
          </div>
          <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">Đang hoạt động</span>
        </div>

        <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold">Thông tin cá nhân</h3>
                <p className="mt-1 text-sm text-stone-500">Các thông tin hiển thị trong hồ sơ của bạn.</p>
              </div>
              {!editing && (
                <button type="button" onClick={startEditing} className="min-h-10 rounded-xl border border-stone-300 bg-white px-4 text-sm font-bold text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600">
                  Chỉnh sửa
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={saveProfile} noValidate className="mt-6 space-y-5">
                <div>
                  <label htmlFor={`${fieldId}-name`} className="text-sm font-bold">Họ và tên</label>
                  <input id={`${fieldId}-name`} autoComplete="name" value={draft.fullName} onChange={(event) => setDraft({ ...draft, fullName: event.target.value })} aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? `${fieldId}-name-error` : undefined} className={inputClass} />
                  {errors.fullName && <p id={`${fieldId}-name-error`} role="alert" className="mt-1 text-xs text-red-700">{errors.fullName}</p>}
                </div>
                <div>
                  <label htmlFor={`${fieldId}-phone`} className="text-sm font-bold">Số điện thoại</label>
                  <input id={`${fieldId}-phone`} type="tel" inputMode="numeric" autoComplete="tel" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? `${fieldId}-phone-error` : undefined} className={inputClass} />
                  {errors.phone && <p id={`${fieldId}-phone-error`} role="alert" className="mt-1 text-xs text-red-700">{errors.phone}</p>}
                </div>
                <div>
                  <label htmlFor={`${fieldId}-email`} className="text-sm font-bold">Email <span className="font-normal text-stone-500">(không bắt buộc)</span></label>
                  <input id={`${fieldId}-email`} type="email" autoComplete="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? `${fieldId}-email-error` : undefined} className={inputClass} placeholder="ten@vidu.com" />
                  {errors.email && <p id={`${fieldId}-email-error`} role="alert" className="mt-1 text-xs text-red-700">{errors.email}</p>}
                </div>
                <div className="flex flex-wrap gap-3 pt-1">
                  <button type="submit" className="min-h-11 rounded-xl bg-amber-400 px-5 text-sm font-extrabold text-stone-950 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600">Lưu thay đổi</button>
                  <button type="button" onClick={cancelEditing} className="min-h-11 rounded-xl border border-stone-300 px-5 text-sm font-bold text-stone-700 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-600">Hủy</button>
                </div>
              </form>
            ) : (
              <dl className="mt-5 divide-y divide-stone-100">
                <div className="grid gap-1 py-4 sm:grid-cols-[145px_1fr] sm:gap-4"><dt className="text-sm text-stone-500">Họ và tên</dt><dd className="break-words text-sm font-bold">{saved.fullName}</dd></div>
                <div className="grid gap-1 py-4 sm:grid-cols-[145px_1fr] sm:gap-4"><dt className="text-sm text-stone-500">Số điện thoại</dt><dd className="text-sm font-bold">{saved.phone}</dd></div>
                <div className="grid gap-1 py-4 sm:grid-cols-[145px_1fr] sm:gap-4"><dt className="text-sm text-stone-500">Email</dt><dd className="break-words text-sm font-bold">{saved.email || "Chưa cập nhật"}</dd></div>
              </dl>
            )}
          </div>

          <aside className="rounded-xl border border-stone-200 bg-stone-50 p-5 sm:p-6" aria-label="Chi tiết tài khoản">
            <h3 className="text-lg font-extrabold">Chi tiết tài khoản</h3>
            <p className="mt-1 text-sm text-stone-500">Thông tin vai trò được quản lý bởi hệ thống.</p>
            <dl className="mt-5 space-y-5">
              <div><dt className="text-xs font-semibold text-stone-500">Mã nhân sự</dt><dd className="mt-1 break-words font-mono text-sm font-bold">{profile.accountId}</dd></div>
              <div><dt className="text-xs font-semibold text-stone-500">Vai trò</dt><dd className="mt-1 text-sm font-bold">{profile.role}</dd></div>
              <div><dt className="text-xs font-semibold text-stone-500">Ngày tham gia</dt><dd className="mt-1 text-sm font-bold">{profile.joinedAt}</dd></div>
              <div><dt className="text-xs font-semibold text-stone-500">Lần đăng nhập cuối</dt><dd className="mt-1 text-sm font-bold">Chưa có dữ liệu demo</dd></div>
            </dl>
          </aside>
        </div>
      </section>
    </div>
  );
}
