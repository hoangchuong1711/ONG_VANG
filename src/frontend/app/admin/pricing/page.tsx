"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminHeading } from "@/components/admin/AdminUI";
import { request } from "@/lib/api-client";
import { amount, dateTime } from "@/lib/admin-live";

type Policy = Record<string, string | number | boolean | null> & {
  loai: "CUOC" | "THANH_VIEN" | "PHU_THU"; ma: string; nhom: string; trang_thai: string;
  hieu_luc_tu: string; hieu_luc_den: string | null;
};
type Customer = { ma_kh: string; ho_ten: string; so_dien_thoai: string | null; ma_hang: string };
type Quote = { km: string; cuocKm: string; cuocKg: string; phuThu: string; giamGia: string; tongCuoc: string; nguon: string };
type PolicyForm = { loai: Policy["loai"]; ma: string; ten: string; maHang: string; maLoai: string; batBuoc: boolean;
  hieuLucTu: string; hieuLucDen: string; cuocCoBan: string; donGiaKm: string; kmToiThieu: string; kmToiDa: string;
  kgBaoGom: string; kgToiDa: string; donGiaKg: string; tyLeGiam: string; soTien: string };

const blankForm = (): PolicyForm => ({ loai: "CUOC", ma: "", ten: "", maHang: "BAC", maLoai: "", batBuoc: true,
  hieuLucTu: "", hieuLucDen: "", cuocCoBan: "0", donGiaKm: "0", kmToiThieu: "0", kmToiDa: "100",
  kgBaoGom: "1", kgToiDa: "100", donGiaKg: "0", tyLeGiam: "0", soTien: "0" });
const localInput = (value: string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";
const datePayload = (value: string) => value ? new Date(value).toISOString().slice(0, 23) : null;

export default function AdminPricingPage() {
  const [items, setItems] = useState<Policy[]>([]), [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [form, setForm] = useState<PolicyForm>(blankForm()), [busy, setBusy] = useState(false);
  const [quoteInput, setQuoteInput] = useState({ maKh: "", diemLay: "", diemGiao: "", kg: "1", loaiHang: "Hàng hóa" });
  const [quote, setQuote] = useState<Quote | null>(null), [quoteError, setQuoteError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [policyData, customerData] = await Promise.all([
        request<{ items: Policy[] }>("/policies"), request<{ items: Customer[] }>("/admin/customers"),
      ]);
      setItems(policyData.items); setCustomers(customerData.items);
      setQuoteInput((old) => ({ ...old, maKh: old.maKh || customerData.items[0]?.ma_kh || "" }));
    } catch (e) { setItems([]); setError(e instanceof Error ? e.message : "Không tải được dữ liệu"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const set = (key: keyof PolicyForm, value: string | boolean) => setForm((old) => ({ ...old, [key]: value }));
  const startEdit = (item: Policy) => setForm({ ...blankForm(), loai: item.loai, ma: item.ma, ten: String(item.ten ?? ""),
    maHang: item.nhom, maLoai: String(item.ma_loai ?? item.nhom), batBuoc: Boolean(item.bat_buoc),
    hieuLucTu: localInput(item.hieu_luc_tu), hieuLucDen: localInput(item.hieu_luc_den),
    cuocCoBan: String(item.cuoc_co_ban ?? 0), donGiaKm: String(item.don_gia_km ?? 0),
    kmToiThieu: String(item.km_toi_thieu ?? 0), kmToiDa: String(item.km_toi_da ?? 100),
    kgBaoGom: String(item.kg_bao_gom ?? 1), kgToiDa: String(item.kg_toi_da ?? 100),
    donGiaKg: String(item.don_gia_kg ?? 0), tyLeGiam: String(item.ty_le_giam ?? 0), soTien: String(item.so_tien ?? 0) });

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setNotice(""); setError("");
    try {
      const duLieu: Record<string, unknown> = { hieu_luc_tu: datePayload(form.hieuLucTu), hieu_luc_den: datePayload(form.hieuLucDen) };
      if (form.loai === "CUOC") Object.assign(duLieu, { ten: form.ten, cuoc_co_ban: Number(form.cuocCoBan), don_gia_km: Number(form.donGiaKm),
        km_toi_thieu: Number(form.kmToiThieu), km_toi_da: Number(form.kmToiDa), kg_bao_gom: Number(form.kgBaoGom),
        kg_toi_da: Number(form.kgToiDa), don_gia_kg: Number(form.donGiaKg) });
      if (form.loai === "THANH_VIEN") Object.assign(duLieu, { ma_hang: form.maHang, ty_le_giam: Number(form.tyLeGiam) });
      if (form.loai === "PHU_THU") Object.assign(duLieu, { ma_loai: form.maLoai, ten: form.ten, so_tien: Number(form.soTien), bat_buoc: form.batBuoc });
      await request("/policies", "POST", { hanhDong: "LUU_NHAP", loai: form.loai, ma: form.ma || null, duLieu });
      setNotice(form.ma ? "Bản nháp đã cập nhật." : "Đã tạo bản nháp."); setForm(blankForm()); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Không lưu được bản nháp"); }
    finally { setBusy(false); }
  };
  const action = async (item: Policy, hanhDong: string, den?: string) => {
    setBusy(true); setError(""); setNotice("");
    try { await request("/policies", "POST", { hanhDong, loai: item.loai, ma: item.ma, ...(den ? { den } : {}) });
      setNotice("Đã cập nhật chính sách."); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Không cập nhật được chính sách"); }
    finally { setBusy(false); }
  };
  const preview = async (event: React.FormEvent) => {
    event.preventDefault(); setQuote(null); setQuoteError("");
    try { const result = await request<Quote>("/fare/quote", "POST", { maKh: quoteInput.maKh, diemLay: quoteInput.diemLay,
      diemGiao: quoteInput.diemGiao, kienHang: [{ loaiHang: quoteInput.loaiHang, kg: quoteInput.kg }] }); setQuote(result); }
    catch (e) { setQuoteError(e instanceof Error ? e.message : "Không tính được báo giá"); }
  };

  return <>
    <AdminHeading eyebrow="Kinh doanh" title="Chính sách giá" description="Quản lý phiên bản cước, giảm giá thành viên và phụ thu. Bản đã công bố không thể sửa." actions={<button className="admin-button" onClick={() => void load()}>Làm mới</button>} />
    {error && <p role="alert" className="admin-feedback error">{error}</p>}{notice && <p role="status" className="admin-feedback">{notice}</p>}
    <section className="admin-panel admin-pricing-form">
      <div className="admin-section-head"><div><h2>{form.ma ? "Sửa bản nháp" : "Tạo bản nháp chính sách"}</h2><p>Giá đã chốt trên đơn cũ không bị thay đổi.</p></div></div>
      <form className="admin-form-body" onSubmit={save}>
        <div className="admin-form-grid">
          <div className="admin-field"><label>Loại chính sách</label><select value={form.loai} disabled={Boolean(form.ma)} onChange={(e) => set("loai", e.target.value as PolicyForm["loai"])}>
            <option value="CUOC">Biểu phí cước</option><option value="THANH_VIEN">Giảm theo hạng</option><option value="PHU_THU">Phụ thu</option></select></div>
          {form.loai === "CUOC" && <div className="admin-field"><label>Tên biểu phí</label><input required maxLength={100} value={form.ten} onChange={(e) => set("ten", e.target.value)} /></div>}
          {form.loai === "THANH_VIEN" && <><div className="admin-field"><label>Hạng thành viên</label><select value={form.maHang} onChange={(e) => set("maHang", e.target.value)}><option>BAC</option><option>VANG</option><option>KIM_CUONG</option></select></div><div className="admin-field"><label>Tỷ lệ giảm (%)</label><input required type="number" min="0" max="100" step="0.01" value={form.tyLeGiam} onChange={(e) => set("tyLeGiam", e.target.value)} /></div></>}
          {form.loai === "PHU_THU" && <><div className="admin-field"><label>Mã loại phụ thu</label><input required maxLength={30} value={form.maLoai} onChange={(e) => set("maLoai", e.target.value.toUpperCase())} /></div><div className="admin-field"><label>Tên phụ thu</label><input required maxLength={100} value={form.ten} onChange={(e) => set("ten", e.target.value)} /></div><div className="admin-field"><label>Số tiền (đ)</label><input required type="number" min="0" step="1000" value={form.soTien} onChange={(e) => set("soTien", e.target.value)} /></div><label className="admin-checkbox"><input type="checkbox" checked={form.batBuoc} onChange={(e) => set("batBuoc", e.target.checked)} />Bắt buộc áp dụng</label></>}
          {form.loai === "CUOC" && <>{([["cuocCoBan","Cước cơ bản"],["donGiaKm","Đơn giá mỗi km"],["kmToiThieu","Km tối thiểu"],["kmToiDa","Km tối đa"],["kgBaoGom","Kg đã gồm"],["kgToiDa","Kg tối đa"],["donGiaKg","Đơn giá mỗi kg vượt mức"]] as const).map(([key,label]) => <div className="admin-field" key={key}><label>{label}</label><input required type="number" min="0" step={key.includes("Km") || key.includes("kg") || key.includes("Kg") ? "0.01" : "1000"} value={form[key]} onChange={(e) => set(key, e.target.value)} /></div>)}</>}
          <div className="admin-field"><label>Hiệu lực từ</label><input required type="datetime-local" value={form.hieuLucTu} onChange={(e) => set("hieuLucTu", e.target.value)} /></div>
          <div className="admin-field"><label>Hiệu lực đến (để trống nếu chưa đặt)</label><input type="datetime-local" value={form.hieuLucDen} onChange={(e) => set("hieuLucDen", e.target.value)} /></div>
        </div>
        <div className="admin-inline-actions"><button className="admin-button primary" disabled={busy}>{busy ? "Đang lưu..." : "Lưu bản nháp"}</button>{form.ma && <button className="admin-button" type="button" onClick={() => setForm(blankForm())}>Hủy sửa</button>}</div>
      </form>
    </section>
    <section className="admin-panel admin-policy-table"><div className="admin-result-bar"><strong>{loading ? "Đang tải..." : `${items.length} phiên bản`}</strong><span>Hạng Thường (THUONG) áp dụng giảm giá 0% theo quy tắc V2.</span></div>
      {items.length > 0 && <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Loại / nhóm</th><th>Giá trị</th><th>Hiệu lực</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{items.map((item) => <tr key={`${item.loai}-${item.ma}`}>
        <td><strong>{item.loai === "CUOC" ? "Biểu phí" : item.loai === "THANH_VIEN" ? "Thành viên" : "Phụ thu"}</strong><small>{item.nhom}</small></td>
        <td>{item.loai === "CUOC" ? `Cơ bản ${amount(item.cuoc_co_ban)} · ${amount(item.don_gia_km)}/km · ${amount(item.don_gia_kg)}/kg` : item.loai === "THANH_VIEN" ? `Giảm ${item.ty_le_giam}%` : `${String(item.ten ?? item.ma_loai)} · ${amount(item.so_tien)} · ${item.bat_buoc ? "Bắt buộc" : "Tùy chọn"}`}</td>
        <td>{dateTime(item.hieu_luc_tu)}<small>đến {item.hieu_luc_den ? dateTime(item.hieu_luc_den) : "chưa đặt"}</small></td><td>{item.trang_thai}</td>
        <td><div className="admin-inline-actions">{item.trang_thai === "NHAP" && <><button className="admin-text-button" disabled={busy} onClick={() => startEdit(item)}>Sửa</button><button className="admin-text-button" disabled={busy} onClick={() => void action(item,"CONG_BO")}>Công bố</button><button className="admin-text-button danger" disabled={busy} onClick={() => void action(item,"XOA_NHAP")}>Xóa nháp</button></>}{item.trang_thai === "CONG_BO" && !item.hieu_luc_den && <button className="admin-text-button" disabled={busy} onClick={() => { const value = window.prompt("Nhập thời điểm kết thúc hiệu lực (YYYY-MM-DDTHH:mm)"); if (value) void action(item,"DONG_HIEU_LUC",datePayload(value) ?? undefined); }}>Đóng hiệu lực</button>}</div></td>
      </tr>)}</tbody></table></div>}
      {!loading && !items.length && <div className="admin-empty"><strong>Chưa có phiên bản chính sách</strong><p>Tạo bản nháp để bắt đầu.</p></div>}
    </section>
    <section className="admin-panel admin-quote-panel"><div className="admin-section-head"><div><h2>Xem thử báo giá</h2><p>Dùng cùng API tính cước của luồng tạo đơn; không tạo đơn hàng.</p></div></div>
      <form className="admin-form-body" onSubmit={preview}><div className="admin-form-grid">
        <div className="admin-field admin-field-wide"><label>Khách hàng để áp dụng hạng thành viên</label><select required value={quoteInput.maKh} onChange={(e) => setQuoteInput({...quoteInput,maKh:e.target.value})}>{customers.map((c) => <option key={c.ma_kh} value={c.ma_kh}>{c.ho_ten} · {c.ma_hang} · {c.so_dien_thoai ?? "không có SĐT"}</option>)}</select></div>
        <div className="admin-field"><label>Điểm lấy</label><input required value={quoteInput.diemLay} onChange={(e) => setQuoteInput({...quoteInput,diemLay:e.target.value})} /></div><div className="admin-field"><label>Điểm giao</label><input required value={quoteInput.diemGiao} onChange={(e) => setQuoteInput({...quoteInput,diemGiao:e.target.value})} /></div>
        <div className="admin-field"><label>Loại hàng</label><input required value={quoteInput.loaiHang} onChange={(e) => setQuoteInput({...quoteInput,loaiHang:e.target.value})} /></div><div className="admin-field"><label>Khối lượng (kg)</label><input required type="number" min="0.01" step="0.01" value={quoteInput.kg} onChange={(e) => setQuoteInput({...quoteInput,kg:e.target.value})} /></div>
      </div><div className="admin-inline-actions"><button className="admin-button primary">Tính báo giá</button></div></form>
      {quoteError && <p role="alert" className="admin-feedback error">{quoteError}</p>}{quote && <div className="admin-quote-result"><div><span>Quãng đường</span><strong>{quote.km} km</strong></div><div><span>Cước theo km</span><strong>{amount(quote.cuocKm)}</strong></div><div><span>Cước theo kg</span><strong>{amount(quote.cuocKg)}</strong></div><div><span>Phụ thu</span><strong>{amount(quote.phuThu)}</strong></div><div><span>Giảm giá thành viên</span><strong>{amount(quote.giamGia)}</strong></div><div className="total"><span>Tổng cước · nguồn {quote.nguon}</span><strong>{amount(quote.tongCuoc)}</strong></div></div>}
    </section>
  </>;
}
