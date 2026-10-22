# Luồng 2 — Giao diện: từ nhập dữ liệu đến gửi API

[Trở về mục lục](D:/CNPM/ONG_VANG/docs/luong-2-giai-thich/README.md)

Đối chiếu mã nguồn ngày 16/10/2026. Số ở bên trái là dòng của file gốc, không phải dòng của tài liệu. Mỗi đoạn giữ nguyên code, sau đó giải thích từng lệnh/cụm lệnh liên quan. Getter/setter và JSX lặp lại được giải thích theo quy tắc chung kèm chi tiết trường. Đây là tài liệu đọc code, không phải báo cáo đã chạy test.


## create-order/page.tsx

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/frontend/app/create-order/page.tsx) · 3 dòng.

**Ai gọi:** Next.js App Router khi mở /create-order.

**Gọi đến ai:** LiveOrderForm.

### Dòng 1–3

```text
   1 | import { LiveOrderForm } from "@/components/orders/LiveOrderForm";
   2 | 
   3 | export default function CreateOrderPage() { return <LiveOrderForm />; }
```

D1 import component có logic thực từ components/orders/LiveOrderForm. D2 trống để tách. D3 export default page component, trả JSX <LiveOrderForm/>; không truyền dispatcher nên mặc định false. File này không chứa công thức giá hay trực tiếp fetch; React render component con để thực hiện phần đó.



## orders/LiveOrderForm.tsx

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/frontend/components/orders/LiveOrderForm.tsx) · 172 dòng.

**Ai gọi:** CreateOrderPage render component; React gọi lại khi state thay đổi; event handler do click/onChange kích hoạt.

**Gọi đến ai:** api từ live-orders.ts → auth/me, customers, quotes, orders; router.push; Navbar/DispatcherNavbar.

### Dòng 1–7

```text
   1 | "use client";
   2 | 
   3 | import { useEffect, useRef, useState } from "react";
   4 | import { useRouter } from "next/navigation";
   5 | import { DispatcherNavbar } from "@/components/layout/DispatcherNavbar";
   6 | import { Navbar } from "@/components/layout/Navbar";
   7 | import { api, type Order, type PaymentChoice, type PaymentMethod, type Quote, vnd } from "@/lib/live-orders";
```

use client đánh dấu component cần hook/tương tác trình duyệt. useState giữ dữ liệu hiển thị; useRef giữ giá trị qua render mà thay đổi không tự render; useEffect chạy tác vụ sau render. useRouter điều hướng. Import navbar và API/type/format tiền.

### Dòng 8

```text
   8 | 
```



### Dòng 9–19

```text
   9 | type Form = {
  10 |   maKh: string; diemLayHang: string; diemGiaoHang: string; tenNguoiNhan: string;
  11 |   sdtNguoiNhan: string; loaiHangHoa: string; ghiChuBaoQuan: string; khoiLuongKg: string;
  12 |   ghiChuGiaoHang: string; benThanhToan: PaymentChoice; phuongThucThanhToan: PaymentMethod;
  13 | };
  14 | type Customer = { maKh: string; hoTen: string; soDienThoai: string };
  15 | const initial: Form = {
  16 |   maKh: "", diemLayHang: "", diemGiaoHang: "", tenNguoiNhan: "", sdtNguoiNhan: "",
  17 |   loaiHangHoa: "Tài liệu", ghiChuBaoQuan: "", khoiLuongKg: "1.00", ghiChuGiaoHang: "",
  18 |   benThanhToan: "NGUOI_DAT", phuongThucThanhToan: "TIEN_MAT",
  19 | };
```

Form định nghĩa các trường có kiểu; PaymentChoice/PaymentMethod giới hạn chuỗi tại compile time. Customer là hình dạng dữ liệu tra cứu. initial có kg=1.00, loại Tài liệu, người đặt trả và tiền mặt; các trường địa chỉ/người nhận ban đầu rỗng.

### Dòng 20

```text
  20 | 
```



### Dòng 21–31

```text
  21 | export function LiveOrderForm({ dispatcher = false }: { dispatcher?: boolean }) {
  22 |   const router = useRouter();
  23 |   const [form, setForm] = useState<Form>(initial);
  24 |   const [quote, setQuote] = useState<Quote | null>(null);
  25 |   const [error, setError] = useState("");
  26 |   const [busy, setBusy] = useState<"quote" | "order" | null>(null);
  27 |   const [customerQuery, setCustomerQuery] = useState("");
  28 |   const [customers, setCustomers] = useState<Customer[]>([]);
  29 |   const [ready, setReady] = useState(false);
  30 |   const revision = useRef(0);
  31 |   const key = useRef<string | null>(null);
```

dispatcher mặc định false; đây là khả năng tái sử dụng component, không có nghĩa route tổng đài hiện gọi component này (trang tổng đài đang có code riêng). router điều hướng. form/quote/error/busy/query/customers/ready là state. revision đếm sửa form, key giữ Idempotency-Key qua lần thử lại.

### Dòng 32

```text
  32 | 
```



### Dòng 33–40

```text
  33 |   useEffect(() => {
  34 |     api<{ vaiTro: string }>("/auth/me")
  35 |       .then(user => {
  36 |         if (user.vaiTro !== (dispatcher ? "TONG_DAI" : "KHACH_HANG")) throw new Error("Tài khoản không có quyền tạo đơn tại đây.");
  37 |         setReady(true);
  38 |       })
  39 |       .catch(cause => setError(cause instanceof Error ? cause.message : "Chưa đăng nhập."));
  40 |   }, [dispatcher]);
```

Effect gọi GET auth/me. Role phải đúng KHACH_HANG hoặc TONG_DAI tùy prop; đạt thì ready=true, lỗi thì setError. Dependency dispatcher làm effect chạy lại khi prop đổi. Đây là kiểm tra UI; backend vẫn kiểm tra độc lập.

### Dòng 41

```text
  41 | 
```



### Dòng 42–48

```text
  42 |   function change<K extends keyof Form>(field: K, value: Form[K]) {
  43 |     revision.current++;
  44 |     key.current = null;
  45 |     setQuote(null);
  46 |     setError("");
  47 |     setForm(previous => ({ ...previous, [field]: value }));
  48 |   }
```

change generic K giới hạn field là khóa Form, value đúng kiểu Form[K]. Mỗi lần sửa tăng revision, xóa key và quote, xóa lỗi, cập nhật đúng field trên bản sao state. Nhờ vậy không dùng báo giá cũ sau thay đổi thông tin.

### Dòng 49

```text
  49 | 
```



### Dòng 50–58

```text
  50 |   async function searchCustomer() {
  51 |     setError("");
  52 |     if (!customerQuery.trim()) { setError("Hãy nhập tên hoặc SĐT khách hàng."); return; }
  53 |     try {
  54 |       const result = await api<{ items: Customer[] }>(`/customers?q=${encodeURIComponent(customerQuery.trim())}&size=20`);
  55 |       setCustomers(result.items);
  56 |       if (!result.items.length) setError("Không tìm thấy khách hàng trong DB.");
  57 |     } catch (cause) { setError((cause as Error).message); }
  58 |   }
```

searchCustomer chỉ gọi khi bấm tìm. Chặn query rỗng, URL-encode query, GET customers size20, ghi danh sách trả về. Không có kết quả/lỗi thì báo. Backend giới hạn endpoint này cho tổng đài.

### Dòng 59

```text
  59 | 
```



### Dòng 60–65

```text
  60 |   const quoteInput = {
  61 |     ...(dispatcher ? { maKh: form.maKh } : {}), diemLayHang: form.diemLayHang.trim(),
  62 |     diemGiaoHang: form.diemGiaoHang.trim(),
  63 |     kienHang: [{ loaiHangHoa: form.loaiHangHoa.trim(), ghiChuBaoQuan: form.ghiChuBaoQuan.trim(), khoiLuongKg: form.khoiLuongKg }],
  64 |     benThanhToan: form.benThanhToan, phuongThucThanhToan: form.phuongThucThanhToan,
  65 |   };
```

quoteInput chỉ gửi maKh khi dispatcher=true; khách tự tạo để backend suy ra từ session. Trim địa chỉ/tên loại/ghi chú; đóng gói MỘT kiện của form vào mảng; giữ chuỗi kg; thêm lựa chọn trả tiền. Backend hỗ trợ list nhiều kiện nhưng UI này nhập một kiện.

### Dòng 66

```text
  66 | 
```



### Dòng 67–73

```text
  67 |   async function requestQuote() {
  68 |     setError("");
  69 |     if (dispatcher && !form.maKh) { setError("Hãy chọn khách hàng từ DB."); return; }
  70 |     if (!form.diemLayHang.trim() || !form.diemGiaoHang.trim() || !form.loaiHangHoa.trim()
  71 |         || !/^\d+(\.\d{1,2})?$/.test(form.khoiLuongKg) || Number(form.khoiLuongKg) < 0.01) {
  72 |       setError("Hãy nhập hai địa chỉ đầy đủ, kiện hàng và kg hợp lệ."); return;
  73 |     }
```

requestQuote xóa lỗi, bắt buộc chọn khách khi tạo hộ. Kiểm tra hai địa chỉ, loại hàng và kg dạng số tối đa2 số lẻ≥0.01. Đây là kiểm tra nhanh UX; service vẫn kiểm tra lại.

### Dòng 74–80

```text
  74 |     const at = revision.current;
  75 |     setBusy("quote");
  76 |     try {
  77 |       const result = await api<Quote>("/quotes", { method: "POST", body: JSON.stringify(quoteInput) });
  78 |       if (at === revision.current) { setQuote(result); key.current = null; }
  79 |     } catch (cause) { if (at === revision.current) setError((cause as Error).message); }
  80 |     finally { setBusy(null); }
```

Chụp revision lúc gửi; busy=quote; POST quotes với JSON. Chỉ cập nhật quote/lỗi nếu revision chưa đổi, tránh response cũ ghi đè form đã sửa. Nhận quote thì xóa key cũ. finally bỏ busy dù thành công hay lỗi.

### Dòng 81–82

```text
  81 |   }
  82 | 
```

- D81: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.

### Dòng 83–88

```text
  83 |   async function createOrder() {
  84 |     if (!quote || busy) return;
  85 |     if (Date.now() >= Date.parse(quote.hetHanLuc)) { setQuote(null); setError("Báo giá đã hết hạn. Vui lòng báo giá lại."); return; }
  86 |     if (!form.tenNguoiNhan.trim() || !/^0\d{9}$/.test(form.sdtNguoiNhan)) {
  87 |       setError("Hãy nhập tên và SĐT người nhận hợp lệ."); return;
  88 |     }
```

createOrder dừng nếu thiếu quote/đang bận. Kiểm tra thời hạn theo đồng hồ trình duyệt (backend vẫn kiểm tra mốc chính thức), chặn tên rỗng/SĐT không đúng 0+9 chữ số.

### Dòng 89–97

```text
  89 |     setError(""); setBusy("order");
  90 |     if (!key.current) key.current = crypto.randomUUID();
  91 |     try {
  92 |       const result = await api<Order>("/orders", {
  93 |         method: "POST", headers: { "Idempotency-Key": key.current },
  94 |         body: JSON.stringify({ ...quoteInput, maBaoGia: quote.maBaoGia,
  95 |           tenNguoiNhan: form.tenNguoiNhan.trim(), sdtNguoiNhan: form.sdtNguoiNhan,
  96 |           ghiChuGiaoHang: form.ghiChuGiaoHang.trim() }),
  97 |       });
```

Đặt trạng thái đang tạo; chỉ sinh UUID key nếu chưa có. POST orders gửi key qua header và payload gồm quoteInput, mã quote, tên/SĐT/ghi chú. Không gửi tổng tiền tự tính. api trả Order đã xác nhận từ backend.

### Dòng 98–103

```text
  98 |       router.push(dispatcher ? `/dispatcher/orders/${result.maDon}` : `/orders/${result.maDon}`);
  99 |     } catch (cause) {
 100 |       const code = (cause as { code?: string }).code;
 101 |       if (code === "QUOTE_CHANGED" || code === "QUOTE_EXPIRED") { setQuote(null); key.current = null; }
 102 |       setError((cause as Error).message);
 103 |     } finally { setBusy(null); }
```

Thành công điều hướng chi tiết theo maDon. QUOTE_CHANGED/EXPIRED xóa quote và key để lấy lại giá. Các lỗi khác giữ key cho retry cùng payload. finally mở khóa UI.

### Dòng 104–105

```text
 104 |   }
 105 | 
```

- D104: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.

### Dòng 106–112

```text
 106 |   const field = (label: string, name: keyof Form, placeholder = "", type = "text") => (
 107 |     <label className="block text-sm font-semibold text-stone-700">{label}
 108 |       <input type={type} value={form[name]} placeholder={placeholder} step={type === "number" ? "0.01" : undefined}
 109 |         onChange={event => change(name, event.target.value as Form[typeof name])}
 110 |         className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 font-normal text-stone-900 outline-none focus:border-amber-600" />
 111 |     </label>
 112 |   );
```

field là hàm dựng JSX label/input, không phải request. value=form[name] làm input controlled. type number có step0.01; onChange gọi change. Ép kiểu TS chỉ hướng dẫn compiler, không validate runtime. className điều khiển giao diện.

### Dòng 113

```text
 113 | 
```



### Dòng 114–122

```text
 114 |   return <div className="min-h-screen bg-stone-50 text-stone-900">
 115 |     {dispatcher ? <DispatcherNavbar /> : <Navbar />}
 116 |     <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
 117 |       <div><p className="text-xs font-bold uppercase tracking-widest text-amber-700">{dispatcher ? "Tổng đài" : "Khách hàng"}</p>
 118 |         <h1 className="mt-1 text-3xl font-extrabold">Tạo đơn giao hàng</h1>
 119 |         <p className="mt-2 text-sm text-stone-600">Địa chỉ được backend kiểm tra qua Goong. Khi chạy fixture, kết quả sẽ hiện nhãn DEMO.</p></div>
 120 |       {!ready && !error && <p>Đang kiểm tra phiên đăng nhập...</p>}
 121 |       {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
 122 |       {ready && <>
```

Khung trang, navbar theo prop, tiêu đề/mô tả. ready=false chưa lỗi thì hiện đang kiểm tra; error hiện role=alert; chỉ ready=true mới hiện form.

### Dòng 123–132

```text
 123 |         {dispatcher && <section className="rounded-2xl border border-stone-200 bg-white p-5">
 124 |           <h2 className="mb-3 text-lg font-bold">Khách hàng đặt đơn</h2>
 125 |           <div className="flex gap-2"><input value={customerQuery} onChange={event => setCustomerQuery(event.target.value)}
 126 |             placeholder="Tên hoặc SĐT khách" className="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2" />
 127 |             <button type="button" onClick={searchCustomer} className="rounded-xl bg-stone-900 px-4 py-2 text-white">Tìm DB</button></div>
 128 |           {customers.length > 0 && <select value={form.maKh} onChange={event => change("maKh", event.target.value)}
 129 |             className="mt-3 w-full rounded-xl border border-stone-300 px-3 py-2">
 130 |             <option value="">Chọn khách hàng</option>{customers.map(c => <option key={c.maKh} value={c.maKh}>{c.hoTen} · {c.soDienThoai}</option>)}
 131 |           </select>}
 132 |         </section>}
```

Nhánh tổng đài: ô query cập nhật customerQuery; nút gọi searchCustomer; nếu có kết quả render select. Mỗi option key=maKh và chọn gọi change('maKh',...). UI này chưa được route tổng đài hiện tại dùng.

### Dòng 133–138

```text
 133 |         <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
 134 |           <h2 className="text-lg font-bold">Địa chỉ và người nhận</h2>
 135 |           {field("Địa chỉ lấy hàng đầy đủ", "diemLayHang", "Số nhà, đường, phường, TP.HCM")}
 136 |           {field("Địa chỉ giao hàng đầy đủ", "diemGiaoHang", "Số nhà, đường, phường, TP.HCM")}
 137 |           <div className="grid gap-4 sm:grid-cols-2">{field("Tên người nhận", "tenNguoiNhan")}{field("SĐT người nhận", "sdtNguoiNhan", "09xxxxxxxx", "tel")}</div>
 138 |         </section>
```

Nhóm địa chỉ/người nhận: gọi field với tên trường tương ứng; SĐT type tel. Mọi thay đổi đi qua change nên báo giá bị vô hiệu.

### Dòng 139–152

```text
 139 |         <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
 140 |           <h2 className="text-lg font-bold">Kiện và thanh toán</h2>
 141 |           <div className="grid gap-4 sm:grid-cols-2">{field("Loại hàng hóa", "loaiHangHoa")}{field("Khối lượng (kg)", "khoiLuongKg", "1.00", "number")}</div>
 142 |           {field("Ghi chú bảo quản", "ghiChuBaoQuan")}{field("Ghi chú giao hàng", "ghiChuGiaoHang")}
 143 |           <div className="grid gap-4 sm:grid-cols-2">
 144 |             <label className="text-sm font-semibold">Bên trả cước
 145 |               <select value={form.benThanhToan} onChange={event => change("benThanhToan", event.target.value as PaymentChoice)} className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-2.5">
 146 |                 <option value="NGUOI_DAT">Người đặt</option><option value="NGUOI_NHAN">Người nhận</option></select></label>
 147 |             <label className="text-sm font-semibold">Phương thức trả
 148 |               <select value={form.phuongThucThanhToan} onChange={event => change("phuongThucThanhToan", event.target.value as PaymentMethod)} className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-2.5">
 149 |                 <option value="TIEN_MAT">Tiền mặt</option><option value="VNPAY_QR">VNPay QR</option></select></label>
 150 |           </div>
 151 |           <button type="button" onClick={requestQuote} disabled={busy !== null} className="rounded-xl bg-stone-900 px-5 py-3 font-bold text-white disabled:opacity-50">{busy === "quote" ? "Đang báo giá..." : "Kiểm tra địa chỉ và báo giá"}</button>
 152 |         </section>
```

Nhóm kiện/ghi chú và hai select thanh toán. value lấy state, onChange gọi change; option gửi đúng mã API. Nút báo giá gọi requestQuote và disabled khi busy khác null. CSS grid/sm chỉ bố trí responsive, không thay đổi nghiệp vụ.

### Dòng 153–158

```text
 153 |         {quote && <section className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-5">
 154 |           <div className="flex items-center justify-between gap-2"><h2 className="text-lg font-bold">Báo giá từ backend</h2>
 155 |             <span className="rounded-lg bg-amber-200 px-2 py-1 text-xs font-bold">{quote.loTrinh.nguon === "FAKE" ? "DEMO · fixture" : "GOONG"}</span></div>
 156 |           <p className="text-sm">{quote.loTrinh.diemLayHang} → {quote.loTrinh.diemGiaoHang}</p>
 157 |           <p className="text-sm">{quote.loTrinh.quangDuongKm} km · khoảng {Math.ceil(quote.loTrinh.thoiGianDuKienGiay / 60)} phút · {quote.cuoc.tongKhoiLuongKg} kg</p>
 158 |           <dl className="grid grid-cols-2 gap-2 text-sm">
```

Chỉ có quote mới render bảng giá. Nhãn FAKE hiện DEMO, còn lại GOONG. Hiển thị địa chỉ chuẩn, km, thời gian ceil(giây/60), tổng kg do backend trả.

### Dòng 159–165

```text
 159 |             <dt>Cước km</dt><dd className="text-right">{vnd(quote.cuoc.cuocKm)}</dd>
 160 |             <dt>Cước kg</dt><dd className="text-right">{vnd(quote.cuoc.cuocKhoiLuong)}</dd>
 161 |             <dt>Phụ thu</dt><dd className="text-right">{vnd(quote.cuoc.tienPhuThu)}</dd>
 162 |             <dt>Giảm thành viên</dt><dd className="text-right">−{vnd(quote.cuoc.tienGiamGia)}</dd>
 163 |             <dt className="border-t pt-2 font-bold">Tổng cước</dt><dd className="border-t pt-2 text-right text-xl font-extrabold">{vnd(quote.cuoc.tongCuoc)}</dd>
 164 |           </dl>
 165 |           <p className="text-xs text-stone-600">Biểu phí {quote.cuoc.maBieuPhi} v{quote.cuoc.phienBanBieuPhi} · Hết hạn {new Date(quote.hetHanLuc).toLocaleString("vi-VN")}</p>
```

dl/dt/dd là danh sách nhãn–giá trị: cước km, kg, phụ thu, giảm, tổng. vnd chỉ format số để đọc, không tính lại giá.

### Dòng 166–169

```text
 166 |           {quote.hangThanhVien && <p className="text-xs">Hạng {quote.hangThanhVien.tenHang}: {quote.hangThanhVien.conHieuLuc ? `giảm ${quote.hangThanhVien.phanTramGiamGia}%` : "ưu đãi hết hạn"}</p>}
 167 |           <button type="button" onClick={createOrder} disabled={busy !== null} className="rounded-xl bg-amber-700 px-5 py-3 font-bold text-white disabled:opacity-50">{busy === "order" ? "Đang tạo đơn..." : "Xác nhận tạo đơn"}</button>
 168 |         </section>}
 169 |       </>}
```

Hiện mã/phiên bản biểu phí, hạn báo giá theo locale; có hạng thì hiện tỷ lệ hoặc hết hiệu lực. Nút xác nhận gọi createOrder, disabled khi đang bận.

### Dòng 170–172

```text
 170 |     </main>
 171 |   </div>;
 172 | }
```

Đóng fragment/main/div và kết thúc component; dấu ngoặc chỉ kết thúc cấu trúc JSX/hàm.



## create-order/page.tsx

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/frontend/app/dispatcher/create-order/page.tsx) · 402 dòng.

**Ai gọi:** Next.js render khi mở /dispatcher/create-order; React gọi effect/handler.

**Gọi đến ai:** api(customers/quotes/orders), showToast, router.push('/dispatcher'), DispatcherNavbar, Button.

### Dòng 1–19

```text
   1 | "use client";
   2 | 
   3 | import React, { useEffect, useRef, useState } from "react";
   4 | import Link from "next/link";
   5 | import { useRouter } from "next/navigation";
   6 | import { DispatcherNavbar } from "@/components/layout/DispatcherNavbar";
   7 | import { Button } from "@/components/ui/Button";
   8 | import { formatVND } from "@/lib/utils";
   9 | import { useToast } from "@/components/ui/Toast";
  10 | import { api, type Order, type Quote } from "@/lib/live-orders";
  11 | import type { AdminCustomer } from "@/lib/admin-extras";
  12 | 
  13 | const DISTRICTS = ["Quận 1", "Quận 3", "Quận 5", "Quận 7", "Quận 10", "Quận Bình Thạnh"];
  14 | const PACKAGE_TYPES = [
  15 |   "Tài liệu & Hợp đồng hỏa tốc", "Đồ ăn & Thực phẩm giao nhanh",
  16 |   "Mỹ phẩm & Dược phẩm", "Hàng điện tử & Phụ kiện", "Quần áo thời trang", "Khác",
  17 | ];
  18 | type Customer = { maKh: string; hoTen: string; soDienThoai: string;
  19 |   diaChiMacDinh: string | null; hangThanhVien?: { tenHang?: string } | null };
```

Client component. Import hook, router, Link, navbar, button/toast, API và type. AdminCustomer chỉ import type để lấy kiểu tier, không làm dữ liệu khách đến từ demo. DISTRICTS/PACKAGE_TYPES là lựa chọn UI; Customer mô tả dữ liệu API.

### Dòng 20

```text
  20 | 
```



### Dòng 21–40

```text
  21 | export default function DispatcherCreateOrderPage() {
  22 |   const { showToast } = useToast();
  23 |   const router = useRouter();
  24 |   const [callerPhone, setCallerPhone] = useState("");
  25 |   const [customerId, setCustomerId] = useState("");
  26 |   const [senderName, setSenderName] = useState("");
  27 |   const [senderStreet, setSenderStreet] = useState("");
  28 |   const [senderDistrict, setSenderDistrict] = useState(DISTRICTS[0]);
  29 |   const [customerTier, setCustomerTier] = useState<AdminCustomer["tier"]>("THUONG");
  30 |   const [receiverName, setReceiverName] = useState("");
  31 |   const [receiverPhone, setReceiverPhone] = useState("");
  32 |   const [receiverStreet, setReceiverStreet] = useState("");
  33 |   const [receiverDistrict, setReceiverDistrict] = useState(DISTRICTS[0]);
  34 |   const [receiverNotes, setReceiverNotes] = useState("");
  35 |   const [packageType, setPackageType] = useState(PACKAGE_TYPES[0]);
  36 |   const [weightKg, setWeightKg] = useState<number>(0.5);
  37 |   const [paymentMethod, setPaymentMethod] = useState<"TIEN_MAT" | "VNPAY">("TIEN_MAT");
  38 |   const [quoted, setQuoted] = useState<{ input: string; result: Quote } | null>(null);
  39 |   const [creating, setCreating] = useState(false);
  40 |   const orderKey = useRef<string | null>(null);
```

State giữ SĐT khách gọi, mã khách, tên/địa chỉ/quận người gửi, hạng, người nhận, ghi chú, loại hàng, kg mặc định0.5, phương thức mặc định tiền mặt. quoted giữ cả JSON input và Quote để đối chiếu; creating khóa nút; orderKey ref giữ key.

### Dòng 41–46

```text
  41 |   useEffect(() => {
  42 |     if (!/^0\d{9}$/.test(callerPhone)) return;
  43 |     let active = true;
  44 |     const timer = setTimeout(() => {
  45 |       api<{ items: Customer[] }>(`/customers?q=${encodeURIComponent(callerPhone)}&size=20`)
  46 |         .then(page => {
```

Effect tra khách chỉ chạy khi SĐT khớp 0+9 chữ số. active=true đánh dấu effect hiện hành. setTimeout300ms debounce giảm số request khi gõ. Gọi customers với query SĐT URL-encode.

### Dòng 47–56

```text
  47 |           if (!active) return;
  48 |           const customer = page.items.find(item => item.soDienThoai === callerPhone);
  49 |           if (!customer) { setCustomerId(""); setSenderName(""); showToast("Không tìm thấy khách hàng trong DB.", "error"); return; }
  50 |           setCustomerId(customer.maKh); setSenderName(customer.hoTen);
  51 |           if (customer.diaChiMacDinh) setSenderStreet(customer.diaChiMacDinh);
  52 |           setCustomerTier(customer.hangThanhVien?.tenHang === "VANG" ? "VANG" : "THUONG");
  53 |         }).catch(cause => { if (active) showToast((cause as Error).message, "error"); });
  54 |     }, 300);
  55 |     return () => { active = false; clearTimeout(timer); };
  56 |   }, [callerPhone, showToast]);
```

Response cũ bị bỏ qua nếu active=false. Tìm khách có SĐT khớp chính xác. Không thấy xóa khách/tên và toast; thấy thì điền mã/tên/địa chỉ mặc định. Nhãn hạng UI chỉ nhận VANG hoặc THUONG ở đây, không phản ánh đủ mọi hạng; cước vẫn do backend tính. Cleanup đặt inactive và hủy timer chưa chạy; không hủy HTTP đã gửi.

### Dòng 57

```text
  57 | 
```



### Dòng 58–63

```text
  58 |   const handleLookupCustomer = (phoneInput: string) => {
  59 |     if (phoneInput === callerPhone) return;
  60 |     setCallerPhone(phoneInput);
  61 |     setCustomerId("");
  62 |     setSenderName("");
  63 |   };
```

handleLookupCustomer: nếu không đổi số thì bỏ qua; nếu đổi thì cập nhật số, xóa ID/tên khách cũ để không tạo hộ nhầm hồ sơ.

### Dòng 64–66

```text
  64 |   const pickup = /TP\.HCM|Hồ Chí Minh/i.test(senderStreet)
  65 |     ? senderStreet.trim() : [senderStreet.trim(), senderDistrict, "TP.HCM"].filter(Boolean).join(", ");
  66 |   const dropoff = [receiverStreet.trim(), receiverDistrict, "TP.HCM"].filter(Boolean).join(", ");
```

pickup nếu street đã chứa TP.HCM/Hồ Chí Minh thì dùng nguyên chuỗi trim; nếu không ghép street, district, TP.HCM. dropoff luôn ghép ba phần. filter(Boolean) loại phần rỗng; join(', ') nối địa chỉ.

### Dòng 67–75

```text
  67 |   const quoteInput = { maKh: customerId, diemLayHang: pickup, diemGiaoHang: dropoff,
  68 |     kienHang: [{ loaiHangHoa: packageType, ghiChuBaoQuan: "", khoiLuongKg: weightKg.toFixed(2) }],
  69 |     benThanhToan: "NGUOI_DAT", phuongThucThanhToan: paymentMethod === "VNPAY" ? "VNPAY_QR" : "TIEN_MAT" };
  70 |   const quoteRequestBody = JSON.stringify(quoteInput);
  71 |   const quote = quoted?.input === quoteRequestBody ? quoted.result : null;
  72 |   const distanceKm = Number(quote?.loTrinh.quangDuongKm ?? 0);
  73 |   const baseFee = Number(quote?.cuoc.cuocGoc ?? 0);
  74 |   const vipDiscount = Number(quote?.cuoc.tienGiamGia ?? 0);
  75 |   const totalFee = Number(quote?.cuoc.tongCuoc ?? 0);
```

quoteInput luôn gửi maKh, một kiện có kg.toFixed(2), người đặt trả; UI VNPAY đổi thành VNPAY_QR. JSON.stringify tạo dấu nhận diện input. Chỉ dùng quoted nếu input còn khớp. Các Number chuyển tiền phục vụ hiển thị; không ghi tổng từ client vào đơn.

### Dòng 76

```text
  76 | 
```



### Dòng 77–87

```text
  77 |   useEffect(() => {
  78 |     orderKey.current = null;
  79 |     if (!customerId || !senderStreet.trim() || !receiverStreet.trim() || weightKg <= 0) return;
  80 |     let active = true;
  81 |     const timer = setTimeout(() => {
  82 |       api<Quote>("/quotes", { method: "POST", body: quoteRequestBody })
  83 |         .then(result => { if (active) setQuoted({ input: quoteRequestBody, result }); })
  84 |         .catch(() => { if (active) setQuoted(null); });
  85 |     }, 500);
  86 |     return () => { active = false; clearTimeout(timer); };
  87 |   }, [customerId, senderStreet, receiverStreet, weightKg, quoteRequestBody]);
```

Effect báo giá: reset orderKey khi input liên quan thay đổi; thiếu khách/địa chỉ/kg hợp lệ thì không gọi. Đợi500ms rồi POST quotes; giữ cả input và kết quả nếu effect còn active. Lỗi xóa quoted; cleanup bỏ qua response cũ/hủy timer. Không hiện chi tiết lỗi báo giá trong catch này.

### Dòng 88

```text
  88 | 
```



### Dòng 89–96

```text
  89 |   const handleCreateOrder = async (event: React.FormEvent) => {
  90 |     event.preventDefault();
  91 |     if (!customerId || !receiverName.trim() || !/^0\d{9}$/.test(receiverPhone) || !senderStreet.trim() || !receiverStreet.trim()) {
  92 |       showToast("Hãy chọn khách hàng từ DB và nhập đầy đủ địa chỉ, người nhận, SĐT.", "error"); return;
  93 |     }
  94 |     if (creating) return;
  95 |     setCreating(true);
  96 |     if (!orderKey.current) orderKey.current = crypto.randomUUID();
```

Submit form preventDefault để không reload. Kiểm tra khách đã chọn, tên/SĐT/địa chỉ người nhận. Chặn đang creating. Đặt creating=true, sinh key nếu chưa có.

### Dòng 97–102

```text
  97 |     try {
  98 |       const freshQuote = await api<Quote>("/quotes", { method: "POST", body: JSON.stringify(quoteInput) });
  99 |       const result = await api<Order>("/orders", { method: "POST", headers: { "Idempotency-Key": orderKey.current },
 100 |         body: JSON.stringify({ ...quoteInput, maBaoGia: freshQuote.maBaoGia,
 101 |           tenNguoiNhan: receiverName.trim(), sdtNguoiNhan: receiverPhone,
 102 |           ghiChuGiaoHang: receiverNotes.trim() }) });
```

Khác LiveOrderForm: lấy freshQuote mới ngay khi submit rồi dùng mã mới POST orders cùng key. Payload có quoteInput, tên/SĐT/ghi chú. Đây là hành vi code hiện tại, không nói trang tổng đài tái dùng đúng quote đã hiển thị.

### Dòng 103–107

```text
 103 |       showToast(`Đã tạo đơn ${result.maDon} trong DB.`, "success");
 104 |       router.push("/dispatcher");
 105 |     } catch (cause) { showToast((cause as Error).message, "error"); }
 106 |     finally { setCreating(false); }
 107 |   };
```

Thành công toast mã đơn và về bàn điều phối; lỗi toast message; finally mở nút. Lưu ý retry sau lỗi có thể lấy mã báo giá mới nhưng giữ key cũ: nếu request trước đã commit, backend có thể báo IDEMPOTENCY_CONFLICT do payload khác. Đây là hệ quả đọc code, chưa kiểm thử tái hiện trong lượt giải thích này.

### Dòng 108

```text
 108 | 
```



### Dòng 109–135

```text
 109 |   return (
 110 |     <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#1C1917] font-sans">
 111 |       <DispatcherNavbar />
 112 | 
 113 |       <main className="flex-1 max-w-[1100px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
 114 |         {/* Header */}
 115 |         <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-200">
 116 |           <div className="shrink-0">
 117 |             <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-1.5 whitespace-nowrap">
 118 |               HOTLINE TIẾP NHẬN
 119 |             </div>
 120 |             <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
 121 |               Tiếp Nhận Cuộc Gọi Tạo Đơn Nhanh
 122 |             </h1>
 123 |             <p className="text-xs sm:text-sm text-stone-500 mt-1">
 124 |               Tra cứu hồ sơ khách hàng theo SĐT, tự động tính cước snapshot và đẩy vào hàng đợi tác chiến
 125 |             </p>
 126 |           </div>
 127 | 
 128 |           <Link
 129 |             href="/dispatcher"
 130 |             className="text-xs sm:text-sm font-semibold text-stone-500 hover:text-amber-800 transition-colors whitespace-nowrap shrink-0"
 131 |           >
 132 |             ← Bàn điều phối
 133 |           </Link>
 134 |         </div>
 135 | 
```

Khung trang và navbar. Header/badge/đoạn mô tả là chữ tĩnh. Link href=/dispatcher điều hướng về bàn điều phối; className chỉ bố cục/màu/font/responsive.

### Dòng 136–151

```text
 136 |         <form onSubmit={handleCreateOrder} className="space-y-6">
 137 |           {/* STEP 1: KHÁCH HÀNG GỌI ĐẾN */}
 138 |           <section className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
 139 |             <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
 140 |               <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
 141 |                 1. Thông tin khách gọi đến (Người gửi)
 142 |               </span>
 143 |               {customerTier !== "THUONG" && (
 144 |                 <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
 145 |                   Hạng {customerTier === "VANG" ? "Vàng" : "Bạc"} (giảm {formatVND(vipDiscount)})
 146 |                 </span>
 147 |               )}
 148 |             </div>
 149 | 
 150 |             {/* Quick lookup by phone */}
 151 |             <div className="space-y-1.5">
```

form onSubmit nối sự kiện submit với handleCreateOrder. Section1 thông tin người gửi; badge chỉ khi customerTier khác THUONG, số giảm hiển thị từ backend.

### Dòng 152–185

```text
 152 |               <label className="block text-xs font-bold text-stone-700">
 153 |                 Số điện thoại khách gọi:
 154 |               </label>
 155 |               <div className="flex flex-wrap sm:flex-nowrap gap-2">
 156 |                 <input
 157 |                   type="tel"
 158 |                   required
 159 |                   value={callerPhone}
 160 |                   onChange={(e) => handleLookupCustomer(e.target.value)}
 161 |                   placeholder="Ví dụ: 0900000001"
 162 |                   className="flex-1 h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
 163 |                 />
 164 |                 <button
 165 |                   type="button"
 166 |                   onClick={() => handleLookupCustomer("0900000001")}
 167 |                   className="h-11 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-bold text-amber-900 border border-stone-200 transition-colors cursor-pointer"
 168 |                 >
 169 |                   Mẫu VIP (Thu Hà)
 170 |                 </button>
 171 |                 <button
 172 |                   type="button"
 173 |                   onClick={() => handleLookupCustomer("0900000002")}
 174 |                   className="h-11 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-bold text-stone-700 border border-stone-200 transition-colors cursor-pointer"
 175 |                 >
 176 |                   Mẫu Thường
 177 |                 </button>
 178 |               </div>
 179 |             </div>
 180 | 
 181 |             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
 182 |               <div>
 183 |                 <label className="block text-xs font-bold text-stone-600 mb-1">
 184 |                   Họ tên người gửi:
 185 |                 </label>
```

Ô tel required: value=callerPhone, onChange gọi handleLookupCustomer. Hai button type=button chỉ điền SĐT fixture để tra API, không submit và không tự tạo khách. Placeholder/nhãn không phải dữ liệu lưu.

### Dòng 186–225

```text
 186 |                 <input
 187 |                   type="text"
 188 |                   required
 189 |                   value={senderName}
 190 |                   onChange={(e) => setSenderName(e.target.value)}
 191 |                   className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
 192 |                 />
 193 |               </div>
 194 | 
 195 |               <div>
 196 |                 <label className="block text-xs font-bold text-stone-600 mb-1">
 197 |                   Địa chỉ lấy hàng:
 198 |                 </label>
 199 |                 <input
 200 |                   type="text"
 201 |                   required
 202 |                   value={senderStreet}
 203 |                   onChange={(e) => setSenderStreet(e.target.value)}
 204 |                   className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
 205 |                 />
 206 |               </div>
 207 | 
 208 |               <div>
 209 |                 <label className="block text-xs font-bold text-stone-600 mb-1">
 210 |                   Quận huyện:
 211 |                 </label>
 212 |                 <select
 213 |                   value={senderDistrict}
 214 |                   onChange={(e) => setSenderDistrict(e.target.value)}
 215 |                   className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
 216 |                 >
 217 |                   {DISTRICTS.map((d) => (
 218 |                     <option key={d} value={d}>
 219 |                       {d}
 220 |                     </option>
 221 |                   ))}
 222 |                 </select>
 223 |               </div>
 224 |             </div>
 225 |           </section>
```

Các input tên/địa chỉ và select quận đều controlled bằng state. onChange gọi setter tương ứng; DISTRICTS.map tạo option có key. senderName chỉnh sửa để hiển thị nhưng quoteInput/order payload không gửi tên người gửi này để sửa hồ sơ DB.

### Dòng 226

```text
 226 | 
```



### Dòng 227–265

```text
 227 |           {/* STEP 2: ĐIỂM GIAO HÀNG (NGƯỜI NHẬN) */}
 228 |           <section className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
 229 |             <span className="text-xs font-bold uppercase tracking-wider text-stone-700 block border-b border-stone-200 pb-3">
 230 |               2. Điểm giao hàng (Người nhận)
 231 |             </span>
 232 | 
 233 |             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 234 |               <div>
 235 |                 <label className="block text-xs font-bold text-stone-600 mb-1">
 236 |                   Họ tên người nhận:
 237 |                 </label>
 238 |                 <input
 239 |                   type="text"
 240 |                   required
 241 |                   value={receiverName}
 242 |                   onChange={(e) => setReceiverName(e.target.value)}
 243 |                   className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
 244 |                 />
 245 |               </div>
 246 | 
 247 |               <div>
 248 |                 <label className="block text-xs font-bold text-stone-600 mb-1">
 249 |                   Số điện thoại người nhận:
 250 |                 </label>
 251 |                 <input
 252 |                   type="tel"
 253 |                   required
 254 |                   value={receiverPhone}
 255 |                   onChange={(e) => setReceiverPhone(e.target.value)}
 256 |                   className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
 257 |                 />
 258 |               </div>
 259 |             </div>
 260 | 
 261 |             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 262 |               <div className="sm:col-span-2">
 263 |                 <label className="block text-xs font-bold text-stone-600 mb-1">
 264 |                   Địa chỉ chi tiết:
 265 |                 </label>
```

Section2: tên người nhận và SĐT; required là kiểm tra HTML; state receiverName/receiverPhone được handler gửi backend. type tel không tự bảo đảm regex; handler còn kiểm tra.

### Dòng 266–304

```text
 266 |                 <input
 267 |                   type="text"
 268 |                   required
 269 |                   value={receiverStreet}
 270 |                   onChange={(e) => setReceiverStreet(e.target.value)}
 271 |                   className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
 272 |                 />
 273 |               </div>
 274 | 
 275 |               <div>
 276 |                 <label className="block text-xs font-bold text-stone-600 mb-1">
 277 |                   Quận huyện giao:
 278 |                 </label>
 279 |                 <select
 280 |                   value={receiverDistrict}
 281 |                   onChange={(e) => setReceiverDistrict(e.target.value)}
 282 |                   className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
 283 |                 >
 284 |                   {DISTRICTS.map((d) => (
 285 |                     <option key={d} value={d}>
 286 |                       {d}
 287 |                     </option>
 288 |                   ))}
 289 |                 </select>
 290 |               </div>
 291 |             </div>
 292 | 
 293 |             <div>
 294 |               <label className="block text-xs font-bold text-stone-600 mb-1">
 295 |                 Ghi chú điều phối cho tài xế:
 296 |               </label>
 297 |               <input
 298 |                 type="text"
 299 |                 value={receiverNotes}
 300 |                 onChange={(e) => setReceiverNotes(e.target.value)}
 301 |                 className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
 302 |               />
 303 |             </div>
 304 |           </section>
```

Địa chỉ nhận, quận nhận và ghi chú. onChange cập nhật receiverStreet/receiverDistrict/receiverNotes. Ghi chú gửi vào ghiChuGiaoHang; các wrapper div/label tổ chức form.

### Dòng 305

```text
 305 | 
```



### Dòng 306–328

```text
 306 |           {/* STEP 3: KIỆN HÀNG & BÁO GIÁ CƯỚC TỨC THÌ */}
 307 |           <section className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
 308 |             <span className="text-xs font-bold uppercase tracking-wider text-stone-700 block border-b border-stone-200 pb-3">
 309 |               3. Kiện hàng & tính cước tức thì
 310 |             </span>
 311 | 
 312 |             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 313 |               <div>
 314 |                 <label className="block text-xs font-bold text-stone-600 mb-1">
 315 |                   Phân loại bưu phẩm:
 316 |                 </label>
 317 |                 <select
 318 |                   value={packageType}
 319 |                   onChange={(e) => setPackageType(e.target.value)}
 320 |                   className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
 321 |                 >
 322 |                   {PACKAGE_TYPES.map((t) => (
 323 |                     <option key={t} value={t}>
 324 |                       {t}
 325 |                     </option>
 326 |                   ))}
 327 |                 </select>
 328 |               </div>
```

Section3: select loại hàng nối packageType; PACKAGE_TYPES.map tạo option. Chọn loại làm quoteRequestBody đổi, kích hoạt effect báo giá.

### Dòng 329

```text
 329 | 
```



### Dòng 330–343

```text
 330 |               <div>
 331 |                 <label className="block text-xs font-bold text-stone-600 mb-1">
 332 |                   Khối lượng (kg):
 333 |                 </label>
 334 |                 <input
 335 |                   type="number"
 336 |                   min={0.1}
 337 |                   max={30}
 338 |                   step={0.1}
 339 |                   value={weightKg}
 340 |                   onChange={(e) => setWeightKg(Number(e.target.value))}
 341 |                   className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
 342 |                 />
 343 |               </div>
```

Ô kg type number: min0.1,max30,step0.1; onChange chuyển chuỗi input thành Number và cập nhật weightKg. HTML giới hạn hỗ trợ UX; backend vẫn kiểm tra tổng kg theo biểu phí.

### Dòng 344

```text
 344 | 
```



### Dòng 345–357

```text
 345 |               <div>
 346 |                 <label className="block text-xs font-bold text-stone-600 mb-1">
 347 |                   Phương thức thanh toán:
 348 |                 </label>
 349 |                 <select
 350 |                   value={paymentMethod}
 351 |                   onChange={(e) => setPaymentMethod(e.target.value as "TIEN_MAT" | "VNPAY")}
 352 |                   className="w-full h-11 px-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
 353 |                 >
 354 |                   <option value="TIEN_MAT">Tiền mặt COD khi giao</option>
 355 |                   <option value="VNPAY">Cổng VNPay trực tuyến</option>
 356 |                 </select>
 357 |               </div>
```

Select phương thức dùng TIEN_MAT/VNPAY của UI. Option tiền mặt đang ghi 'COD khi giao' nhưng quoteInput hard-code NGUOI_DAT; khi trình bày phải theo payload/nghiệp vụ backend, không dựa riêng nhãn này.

### Dòng 358–359

```text
 358 |             </div>
 359 | 
```

- D358: Dòng tiếp nối cấu trúc của khối lệnh ngay trước/sau; đọc cùng khối có lời giải bên cạnh.

### Dòng 360–379

```text
 360 |             {/* BẢNG TÍNH CƯỚC */}
 361 |             <div className="bg-stone-50 p-4 sm:p-5 rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm">
 362 |               <div className="space-y-1.5 text-stone-600 font-medium">
 363 |                 <div>Khoảng cách dự kiến: <span className="text-stone-900 font-bold">{quote ? distanceKm : "—"} km</span></div>
 364 |                 <div>Cước cơ bản: <span className="text-stone-900 font-bold">{formatVND(baseFee)}</span></div>
 365 |                 {vipDiscount > 0 && (
 366 |                   <div className="text-emerald-700 font-semibold">Giảm hội viên VIP: <strong>-{formatVND(vipDiscount)}</strong></div>
 367 |                 )}
 368 |               </div>
 369 | 
 370 |               <div className="text-right">
 371 |                 <span className="text-xs text-stone-500 uppercase tracking-wider block font-bold">
 372 |                   Tổng cước thanh toán
 373 |                 </span>
 374 |                 <span className="text-2xl sm:text-3xl font-extrabold text-amber-700">
 375 |                   {quote ? formatVND(totalFee) : "Đang tính cước..."}
 376 |                 </span>
 377 |               </div>
 378 |             </div>
 379 |           </section>
```

Bảng giá: khoảng cách, cuocGoc, giảm nếu >0 và tổng từ quote. Chưa có quote thì hiện đang tính. formatVND chỉ định dạng tiền; phần tên 'cước cơ bản' hiển thị cuocGoc vốn gồm cước km+kg.

### Dòng 380

```text
 380 | 
```



### Dòng 381–402

```text
 381 |           {/* ACTIONS */}
 382 |           <div className="flex items-center justify-end gap-3 pt-2">
 383 |             <Link href="/dispatcher">
 384 |               <Button variant="outline" size="md" className="text-xs font-semibold">
 385 |                 Hủy bỏ
 386 |               </Button>
 387 |             </Link>
 388 |             <Button
 389 |               variant="primary"
 390 |               size="lg"
 391 |               type="submit"
 392 |               disabled={creating}
 393 |               className="text-xs sm:text-sm font-bold shadow-sm"
 394 |             >
 395 |               Tạo đơn & Đưa vào hàng đợi điều phối ➔
 396 |             </Button>
 397 |           </div>
 398 |         </form>
 399 |       </main>
 400 |     </div>
 401 |   );
 402 | }
```

Link Hủy bỏ về dispatcher. Button tạo đơn type submit kích hoạt form handler, disabled=creating. Các dòng cuối đóng form/main/div/component. Không có lời gọi phân công tài xế ở nút này; đơn chỉ vào CHO_GAN.



## lib/live-orders.ts

[Mở mã nguồn](D:/CNPM/ONG_VANG/src/frontend/lib/live-orders.ts) · 91 dòng.

**Ai gọi:** LiveOrderForm, trang tổng đài và nhiều màn hình đơn gọi api; giao diện gọi vnd.

**Gọi đến ai:** fetch tới /api/auth/csrf rồi /api+path; Next rewrite chuyển sang backend.

### Dòng 1–4

```text
   1 | export type PaymentChoice = "NGUOI_DAT" | "NGUOI_NHAN";
   2 | export type PaymentMethod = "TIEN_MAT" | "VNPAY_QR";
   3 | 
   4 | export type Parcel = { loaiHangHoa: string; ghiChuBaoQuan?: string; khoiLuongKg: string };
```

PaymentChoice/Method là union chuỗi; Parcel là kiểu kiện, ghi chú optional. Những type bị xóa khi build JS, không thay kiểm tra runtime.

### Dòng 5–16

```text
   5 | export type Fare = {
   6 |   cuocGoc: string; cuocKm: string; cuocKhoiLuong: string; tongKhoiLuongKg: string;
   7 |   tienPhuThu: string; tienGiamGia: string; tongCuoc: string;
   8 |   maBieuPhi: string; phienBanBieuPhi: number;
   9 |   phuThu: { maPhuThu: string; tenPhuThu: string; soTienTinh: string }[];
  10 | };
  11 | export type Quote = {
  12 |   maBaoGia: string; hetHanLuc: string;
  13 |   loTrinh: { diemLayHang: string; diemGiaoHang: string; quangDuongKm: string; thoiGianDuKienGiay: number; nguon: string };
  14 |   cuoc: Fare;
  15 |   hangThanhVien: { tenHang: string; phanTramGiamGia: string; conHieuLuc: boolean; ngayHetHan: string | null } | null;
  16 | };
```

Fare mô tả các khoản tiền dạng chuỗi và policy version. Quote gồm mã/hạn, tuyến, cước và hạng có thể null. UI dùng đúng hình dạng này khi nhận JSON.

### Dòng 17–29

```text
  17 | export type Order = {
  18 |   maDon: string; thoiGianTao: string; diemLayHang: string; diemGiaoHang: string;
  19 |   tenNguoiNhan: string | null; sdtNguoiNhan: string; quangDuongKm: string; ghiChuGiaoHang?: string | null;
  20 |   trangThai: string; maKh: string; maTkTao: string; maTx?: string | null; benThanhToan: PaymentChoice;
  21 |   nguonLoTrinh: "FAKE" | "GOONG";
  22 |   phuongThucThanhToan: PaymentMethod; cuoc: Fare;
  23 |   thanhToan: { trangThai: string; soTienConPhaiThu: string; canDoiSoat: boolean };
  24 |   kienHang: Parcel[];
  25 | };
  26 | export type OrderDetail = Order & {
  27 |   nhatKy: { thuTu: number; loaiSuKien: string; trangThaiSau: string; thoiGian: string;
  28 |     nguoiThucHien?: string | null; tenNguoiThucHien?: string | null; ghiChu?: string | null }[];
  29 | };
```

Order gồm mã/thời gian/địa chỉ/trạng thái/chủ đơn/người tạo/tài xế tùy chọn, cước/kiện/thanh toán. OrderDetail dùng intersection '&' bổ sung nhật ký; không phải kế thừa class runtime.

### Dòng 30–40

```text
  30 | export type Driver = { maTx: string; hoTen: string; soDienThoai: string; trangThaiHoatDong: string; dangBanChuyen: boolean;
  31 |   phuongTien: { bienSoXe: string; loaiXe?: string } | null; viTriDemoDiaChi: string | null; viTriDemoNguon: string | null;
  32 |   kmDenDiemLay: string | null; giayDenDiemLay: number | null; nguonDinhTuyen: string | null };
  33 | export type DriverRoute = {
  34 |   taiXe: { diaChi: string; lat: number; lng: number; nguon: string };
  35 |   diemLay: { diaChi: string; lat: number; lng: number; nguon: string };
  36 |   diemGiao: { diaChi: string; lat: number; lng: number; nguon: string };
  37 |   denDiemLay: { polyline: string; quangDuongKm: string; thoiGianDuKienGiay: number; nguon: string };
  38 |   denDiemGiao: { polyline: string; quangDuongKm: string; thoiGianDuKienGiay: number; nguon: string };
  39 |   nguon: string;
  40 | };
```

Driver và DriverRoute là kiểu dùng chung cho luồng điều phối, không tham gia tính báo giá khách. Chứa vị trí demo, quãng đường/thời gian và polyline.

### Dòng 41

```text
  41 | 
```



### Dòng 42–67

```text
  42 | const messages: Record<string, string> = {
  43 |   PAYMENT_REQUIRED: "Cần thu đủ cước và xử lý đối soát trước khi đi tiếp.",
  44 |   PAYMENT_PENDING: "Đã có yêu cầu thu cước. Hãy kiểm tra hoặc đối soát yêu cầu hiện tại.",
  45 |   PAYMENT_MILESTONE_REQUIRED: "Chưa đến mốc thu cước đã chọn trên đơn.",
  46 |   PAYMENT_METHOD_CONFLICT: "Phương thức thu phải khớp với lựa chọn trên đơn.",
  47 |   PAYMENT_AMOUNT_MISMATCH: "Chỉ xác nhận tiền mặt khi đã nhận đúng tổng cước.",
  48 |   VNPAY_CONFIG_MISSING: "VNPay Sandbox chưa được cấu hình trên máy chủ.",
  49 |   ADDRESS_NOT_FOUND: "Không tìm thấy địa chỉ. Hãy nhập địa chỉ đầy đủ và thử lại.",
  50 |   OUT_OF_SERVICE_AREA: "Địa chỉ hoặc quãng đường nằm ngoài vùng phục vụ.",
  51 |   DISTANCE_INVALID: "Không tính được tuyến đường giữa hai địa chỉ này.",
  52 |   ROUTE_PROVIDER_ERROR: "Dịch vụ bản đồ đang lỗi. Vui lòng thử lại sau.",
  53 |   ROUTE_PROVIDER_TIMEOUT: "Dịch vụ bản đồ quá thời gian chờ. Vui lòng thử lại.",
  54 |   ROUTE_PROVIDER_QUOTA: "Goong đã hết quota tạm thời. Vui lòng thử lại sau hoặc kiểm tra tài khoản Goong.",
  55 |   WEIGHT_LIMIT_EXCEEDED: "Tổng khối lượng vượt giới hạn biểu phí.",
  56 |   QUOTE_EXPIRED: "Báo giá đã hết hạn. Vui lòng báo giá lại.",
  57 |   QUOTE_CHANGED: "Báo giá đã thay đổi. Vui lòng báo giá lại.",
  58 |   FARE_CONFIG_MISSING: "Chưa có biểu phí phù hợp. Vui lòng liên hệ tổng đài.",
  59 |   ORDER_STATE_CONFLICT: "Trạng thái đơn đã đổi. Vui lòng tải lại đơn.",
  60 |   ARRIVAL_REQUIRED: "Hãy xác nhận đã đến điểm nhận trước khi hoàn tất đơn.",
  61 |   DEMO_POSITION_MISSING: "Tài xế chưa có vị trí demo trong DB. Hãy nhờ tổng đài cấu hình.",
  62 |   DRIVER_UNAVAILABLE: "Tài xế không còn khả dụng. Hãy chọn tài xế khác.",
  63 |   CANCELLATION_WINDOW_EXPIRED: "Đã hết thời hạn hủy đơn.",
  64 |   CSRF_INVALID: "Phiên xác thực đã đổi. Vui lòng tải lại trang.",
  65 |   FORBIDDEN: "Tài khoản không có quyền thực hiện thao tác này.",
  66 |   VALIDATION_ERROR: "Thông tin chưa hợp lệ. Hãy kiểm tra địa chỉ, SĐT và khối lượng.",
  67 | };
```

messages là map mã lỗi backend→thông báo Việt. Mỗi dòng khai báo một cặp, không chạy request. Nhóm liên quan luồng2: ADDRESS_NOT_FOUND, OUT_OF_SERVICE_AREA, DISTANCE_INVALID, lỗi provider, kg, quote, cấu hình giá, CSRF, quyền, validation.

### Dòng 68

```text
  68 | 
```



### Dòng 69–73

```text
  69 | export class ApiError extends Error {
  70 |   constructor(public code: string, public status: number) {
  71 |     super(messages[code] ?? `Yêu cầu không thành công (${code || status}).`);
  72 |   }
  73 | }
```

ApiError extends Error. Parameter property public code/status vừa nhận tham số vừa tạo thuộc tính. super lấy thông báo trong map; không có thì thông báo dự phòng chứa code hoặc status.

### Dòng 74

```text
  74 | 
```



### Dòng 75–77

```text
  75 | export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  76 |   const headers = new Headers(options.headers);
  77 |   if (options.body) headers.set("Content-Type", "application/json");
```

api<T> là hàm async generic, trả Promise<T>. Copy headers do caller cung cấp nên giữ Idempotency-Key; có body thì thêm Content-Type JSON.

### Dòng 78–82

```text
  78 |   if (options.method && options.method !== "GET") {
  79 |     const csrf = await fetch("/api/auth/csrf", { credentials: "include", cache: "no-store" });
  80 |     if (!csrf.ok) throw new ApiError("CSRF_INVALID", csrf.status);
  81 |     headers.set("X-CSRF-Token", (await csrf.json()).csrfToken);
  82 |   }
```

Có options.method khác GET thì fetch token CSRF với cookie và no-store. Lỗi lấy token ném ApiError. Đọc JSON rồi gắn X-CSRF-Token. Điều kiện hiện tại kiểm tra khác GET, không phải phân loại đầy đủ mọi safe method.

### Dòng 83–88

```text
  83 |   const response = await fetch(`/api${path}`, { ...options, headers, credentials: "include", cache: "no-store" });
  84 |   if (!response.ok) {
  85 |     const body = await response.json().catch(() => ({}));
  86 |     throw new ApiError(body.code ?? "INTERNAL_ERROR", response.status);
  87 |   }
  88 |   return response.json() as Promise<T>;
```

fetch URL /api+path, trải options rồi ghi đè headers/credentials/cache. HTTP không ok: thử đọc JSON, đọc lỗi thì dùng {}; ném ApiError từ code và status. Thành công parse JSON và ép kiểu Promise<T>; ép kiểu không kiểm tra schema JSON runtime.

### Dòng 89–90

```text
  89 | }
  90 | 
```

- D89: Đóng/mở khối hoặc kết thúc lời gọi đang thấy phía trên; không có nghiệp vụ độc lập.

### Dòng 91

```text
  91 | export const vnd = (amount: string) => `${Number(amount).toLocaleString("vi-VN")} ₫`;
```

vnd chuyển chuỗi tiền sang Number để format vi-VN và thêm ký hiệu đồng. Đây là hiển thị, không phải tính toán kế toán trong backend.


