"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DispatchShell, ErrorNotice } from "@/components/dispatcher/Views";
import { useToast } from "@/components/ui/Toast";
import { useDispatchSession } from "@/components/dispatcher/Session";
import { ApiError, dispatchApi, money, type Customer, type Quote, type QuoteInput, type CreateOrderInput } from "@/lib/api/dispatch";

const packages = ["Tài liệu & Hợp đồng", "Đồ ăn & Thực phẩm", "Mỹ phẩm & Dược phẩm", "Hàng điện tử & Phụ kiện", "Quần áo", "Khác"];
type Attempt = { input: CreateOrderInput; key: string };
function readPending(key: string): Attempt | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(key) ?? "null");
    if (saved && typeof saved.key === "string" && saved.key.length > 0 && saved.key.length <= 100
      && typeof saved.input?.maBaoGia === "string" && typeof saved.input?.maKh === "string"
      && typeof saved.input?.diemLayHang === "string" && typeof saved.input?.diemGiaoHang === "string"
      && typeof saved.input?.sdtNguoiNhan === "string" && Array.isArray(saved.input?.kienHang)) return saved;
  } catch { /* Unavailable or invalid saved state is ignored before a new request is sent. */ }
  return null;
}

export default function DispatcherCreateOrderPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useDispatchSession();
  const pendingKey = `mini-ong-vang.hotline-pending:${user?.maNguoiDung}`;
  const [search, setSearch] = useState("0900000001");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searched, setSearched] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ origin: "", destination: "", recipient: "", note: "", parcel: packages[0], weight: "0.50", care: "" });
  const [quoted, setQuoted] = useState<{ value: Quote; signature: string } | null>(null);
  const [busy, setBusy] = useState<"lookup" | "quote" | "create" | null>(null);
  const [error, setError] = useState<unknown>();
  const [retryAttempt, setRetryAttempt] = useState<Attempt | null>(() => readPending(pendingKey));
  const [now, setNow] = useState(() => Date.now());
  const lock = useRef(false);
  const searchController = useRef<AbortController | null>(null);
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(clock); searchController.current?.abort(); };
  }, []);

  const input: QuoteInput = { maKh: customer?.maKh ?? "", diemLayHang: form.origin.trim(), diemGiaoHang: form.destination.trim(),
    kienHang: [{ loaiHangHoa: form.parcel.trim(), khoiLuongKg: form.weight.trim(), ghiChuBaoQuan: form.care.trim() || undefined }] };
  const signature = JSON.stringify(input);
  const quoteMatches = quoted?.signature === signature;
  const expired = !!quoted && Date.parse(quoted.value.hetHanLuc) <= now;
  const validQuote = !!quoted && quoteMatches && !expired;
  const frozen = !!busy || !!retryAttempt;
  const update = (field: keyof typeof form, value: string) => { setForm((previous) => ({ ...previous, [field]: value })); setError(undefined); };

  async function lookup() {
    if (lock.current || !search.trim()) return;
    lock.current = true; setBusy("lookup"); setError(undefined); setCustomer(null); setQuoted(null); setCustomers([]); setSearched(false);
    const controller = new AbortController(); searchController.current = controller;
    try {
      const result = await dispatchApi.customers(search.trim(), controller.signal);
      if (!controller.signal.aborted) { setCustomers(result.items); setSearched(true); }
    } catch (failure) { if (!controller.signal.aborted) setError(failure); }
    finally { lock.current = false; if (!controller.signal.aborted) setBusy(null); }
  }

  async function getQuote() {
    if (lock.current || retryAttempt) return;
    if (!customer || !input.diemLayHang || !input.diemGiaoHang || !/^(0\.(0[1-9]|[1-9][0-9]?)|[1-9][0-9]{0,7}(\.[0-9]{1,2})?)$/.test(input.kienHang[0].khoiLuongKg)) {
      setError(new ApiError(400, "VALIDATION_ERROR")); return;
    }
    lock.current = true; setBusy("quote"); setError(undefined); setQuoted(null);
    try {
      const value = await dispatchApi.quote(input);
      setQuoted({ value, signature }); setNow(Date.now());
    } catch (failure) { setError(failure); }
    finally { lock.current = false; setBusy(null); }
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    if (!retryAttempt && (!validQuote || !customer || !/^0[0-9]{9}$/.test(form.recipient.trim()))) {
      setError(new ApiError(400, expired ? "QUOTE_EXPIRED" : "VALIDATION_ERROR")); return;
    }
    const attempt = retryAttempt ?? { input: { ...input, maBaoGia: quoted!.value.maBaoGia,
      sdtNguoiNhan: form.recipient.trim(), ghiChuGiaoHang: form.note.trim() || undefined }, key: crypto.randomUUID() };
    try { window.sessionStorage.setItem(pendingKey, JSON.stringify(attempt)); }
    catch { setError(new ApiError(0, "BROWSER_STORAGE_UNAVAILABLE")); return; }
    lock.current = true; setBusy("create"); setError(undefined);
    let succeeded = false;
    try {
      const order = await dispatchApi.createOrder(attempt.input, attempt.key);
      try { window.sessionStorage.removeItem(pendingKey); } catch { /* Replaying a stale key remains safe. */ }
      succeeded = true;
      showToast(`Đã lưu đơn ${order.maDon}. Mở hàng đợi để phân công tài xế.`, "success");
      router.push("/dispatcher");
    } catch (failure) {
      setError(failure);
      // A lost response may follow a committed order. A manual replay keeps the exact key/body.
      const uncertain = !(failure instanceof ApiError) || failure.status === 0 || failure.status >= 500;
      const quoteRejected = failure instanceof ApiError && ["QUOTE_EXPIRED", "QUOTE_CHANGED", "RESOURCE_NOT_FOUND", "VALIDATION_ERROR"].includes(failure.code);
      const unresolved = uncertain || (!!retryAttempt && !quoteRejected);
      setRetryAttempt(unresolved ? attempt : null);
      if (!unresolved) { try { window.sessionStorage.removeItem(pendingKey); } catch { /* Ignore unavailable storage. */ } }
      if (!uncertain && quoteRejected) setQuoted(null);
    } finally { if (!succeeded) { lock.current = false; setBusy(null); } }
  }

  return <DispatchShell>
    <div className="max-w-[1100px] mx-auto space-y-5">
      <section className="dispatch-hero flex flex-wrap justify-between gap-5 items-center">
        <div className="space-y-3"><span className="dispatch-eyebrow">Hotline tiếp nhận</span><h1 className="text-2xl sm:text-3xl font-black">Tiếp Nhận Cuộc Gọi Tạo Đơn Nhanh</h1><p className="text-stone-200">Chọn hồ sơ khách hàng, lấy báo giá và lưu đơn vào hàng đợi điều phối.</p></div>
        <Link href="/dispatcher" className="dispatch-button secondary">← Bàn điều phối</Link>
      </section>
      {error ? <ErrorNotice error={error} /> : null}
      {retryAttempt && <div className="dispatch-error space-y-2" role="alert"><strong>Chưa xác định được đơn đã lưu hay chưa.</strong><p>Khách {retryAttempt.input.maKh} · {retryAttempt.input.diemLayHang} → {retryAttempt.input.diemGiaoHang} · Người nhận {retryAttempt.input.sdtNguoiNhan}</p><p>Thông tin đang được giữ nguyên. Chọn “Kiểm tra lại yêu cầu tạo đơn” để gửi lại đúng yêu cầu cũ và tránh tạo trùng đơn, hoặc mở hàng đợi để đối chiếu.</p><Link className="font-bold underline" href="/dispatcher">Mở hàng đợi để kiểm tra</Link></div>}

      <form onSubmit={create} className="space-y-5">
        <fieldset disabled={frozen} className="dispatch-panel space-y-4 disabled:opacity-70">
          <legend className="sr-only">Khách hàng gọi đến</legend>
          <div className="dispatch-section-head"><div><h2>1. Khách hàng gọi đến</h2><p>Tìm hồ sơ có sẵn trên hệ thống và chọn đúng khách.</p></div>{customer && <span className="dispatch-pill">{customer.hangThanhVien?.conHieuLuc ? customer.hangThanhVien.tenHang : "Khách thường"}</span>}</div>
          <div className="flex flex-wrap sm:flex-nowrap gap-3 items-end"><label className="flex-1 space-y-2 text-sm font-bold"><span>Số điện thoại hoặc tên khách</span><input className="dispatch-input" maxLength={100} value={search} onChange={(event) => { setSearch(event.target.value); setCustomer(null); setQuoted(null); setCustomers([]); setSearched(false); }} /></label><button type="button" className="dispatch-button secondary" disabled={!search.trim()} onClick={lookup}>Tìm khách hàng</button></div>
          {busy === "lookup" && <p role="status">Đang tìm khách hàng…</p>}
          {searched && !customers.length && <p role="status" className="dispatch-empty">Không tìm thấy khách hàng. Kiểm tra số điện thoại hoặc hồ sơ đã được đăng ký.</p>}
          {customers.length > 0 && <div className="grid sm:grid-cols-2 gap-3">{customers.map((item) => <label key={item.maKh} className={`dispatch-preview-card flex gap-3 items-start cursor-pointer ${customer?.maKh === item.maKh ? "!border-amber-500 !bg-amber-50" : ""}`}><input type="radio" name="customer" aria-label={`Chọn khách ${item.hoTen}`} checked={customer?.maKh === item.maKh} onChange={() => { setCustomer(item); setQuoted(null); setError(undefined); setForm((previous) => ({ ...previous, origin: previous.origin || item.diaChiMacDinh || "" })); }} /><span><strong className="block text-sm">{item.hoTen}</strong><small className="text-stone-500">{item.soDienThoai} · {item.maKh}</small></span></label>)}</div>}
        </fieldset>

        <fieldset disabled={frozen} className="dispatch-panel space-y-4 disabled:opacity-70">
          <legend className="sr-only">Thông tin giao hàng</legend>
          <div className="dispatch-section-head"><div><h2>2. Tuyến và người nhận</h2><p>Địa chỉ được dùng để xác định tuyến và báo giá.</p></div></div>
          <div className="grid sm:grid-cols-2 gap-4"><label className="space-y-2 text-sm font-bold"><span>Địa chỉ lấy hàng</span><input className="dispatch-input" required maxLength={255} value={form.origin} onChange={(event) => update("origin", event.target.value)} /></label><label className="space-y-2 text-sm font-bold"><span>Địa chỉ giao hàng</span><input className="dispatch-input" required maxLength={255} value={form.destination} onChange={(event) => update("destination", event.target.value)} /></label><label className="space-y-2 text-sm font-bold"><span>Số điện thoại người nhận</span><input className="dispatch-input" type="tel" required pattern="0[0-9]{9}" maxLength={10} placeholder="10 chữ số, bắt đầu bằng 0" value={form.recipient} onChange={(event) => update("recipient", event.target.value)} /></label><label className="space-y-2 text-sm font-bold"><span>Ghi chú giao hàng</span><input className="dispatch-input" maxLength={500} value={form.note} onChange={(event) => update("note", event.target.value)} /></label></div>
          <details className="text-sm text-stone-500"><summary className="cursor-pointer font-semibold">Địa chỉ khi kiểm thử trên máy</summary><p className="mt-2">Với ROUTE_PROVIDER=fake, dùng “Quận 1” → “Quận 3” hoặc “Quận 5”. Cấu hình này chỉ hỗ trợ tuyến thử có sẵn; địa chỉ đường phố đầy đủ cần dịch vụ bản đồ thật.</p></details>
        </fieldset>

        <fieldset disabled={frozen} className="dispatch-panel space-y-4 disabled:opacity-70">
          <legend className="sr-only">Kiện hàng và báo giá</legend>
          <div className="dispatch-section-head"><div><h2>3. Kiện hàng và báo giá</h2><p>Cước và ưu đãi được tính tại backend cho khách đã chọn.</p></div></div>
          <div className="grid sm:grid-cols-3 gap-4"><label className="space-y-2 text-sm font-bold"><span>Loại hàng hóa</span><select className="dispatch-input" value={form.parcel} onChange={(event) => update("parcel", event.target.value)}>{packages.map((item) => <option key={item}>{item}</option>)}</select></label><label className="space-y-2 text-sm font-bold"><span>Khối lượng (kg)</span><input className="dispatch-input" type="number" required min="0.01" max="99999999.99" step="0.01" value={form.weight} onChange={(event) => update("weight", event.target.value)} /></label><label className="space-y-2 text-sm font-bold"><span>Ghi chú bảo quản</span><input className="dispatch-input" maxLength={500} value={form.care} onChange={(event) => update("care", event.target.value)} /></label></div>
          <button className="dispatch-button secondary" type="button" disabled={!customer} onClick={getQuote}>Lấy báo giá</button>
        </fieldset>

        {quoted && <section className="dispatch-panel !bg-amber-50 !border-amber-200 space-y-3" aria-label="Báo giá từ backend">
          {!quoteMatches ? <p role="status" className="font-bold text-amber-900">Thông tin đơn đã thay đổi. Lấy báo giá mới trước khi tạo đơn.</p> : <>
            <div className="flex flex-wrap justify-between gap-4"><div className="text-sm space-y-1"><p>Quãng đường: <strong>{quoted.value.loTrinh.quangDuongKm} km</strong></p><p>Cước gốc: {money(quoted.value.cuoc.cuocGoc)}</p><p>Phụ thu: {money(quoted.value.cuoc.tienPhuThu)}</p><p>Giảm giá: {money(quoted.value.cuoc.tienGiamGia)}</p></div><div><p className="text-xs uppercase font-bold text-stone-500">Tổng cước đã báo</p><strong className="text-3xl text-amber-800">{money(quoted.value.cuoc.tongCuoc)}</strong></div></div>
            <p role="status" className={expired ? "text-rose-700 font-bold" : "text-stone-600 text-sm"}>{expired ? "Báo giá đã hết hạn. Hãy lấy báo giá mới." : `Báo giá còn hiệu lực ${Math.max(0, Math.ceil((Date.parse(quoted.value.hetHanLuc) - now) / 1000))} giây.`}</p>
          </>}
        </section>}
        {busy && <p role="status">{busy === "quote" ? "Đang lấy báo giá từ hệ thống…" : busy === "create" ? "Đang lưu đơn vào hệ thống…" : "Đang tìm khách hàng…"}</p>}
        <div className="flex flex-wrap justify-end gap-3"><Link href="/dispatcher" className="dispatch-button secondary">Quay lại hàng đợi</Link><button className="dispatch-button" type="submit" disabled={!!busy || (!retryAttempt && !validQuote)}>{retryAttempt ? "Kiểm tra lại yêu cầu tạo đơn" : "Tạo đơn & Đưa vào hàng đợi điều phối"}</button></div>
      </form>
    </div>
  </DispatchShell>;
}
