"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminHeading } from "@/components/admin/AdminUI";
import { request } from "@/lib/api-client";

type PolicyType = "CUOC" | "THANH_VIEN" | "PHU_THU";
type Policy = Record<string, string | number | boolean | null>;
type Policies = { fares: Policy[]; memberships: Policy[]; surcharges: Policy[] };
type Form = Record<string, string | boolean>;

const labels: Record<PolicyType, string> = { CUOC: "Biểu phí", THANH_VIEN: "Thành viên", PHU_THU: "Phụ thu" };
const idField: Record<PolicyType, string> = { CUOC: "ma_bieu_phi", THANH_VIEN: "ma_chinh_sach", PHU_THU: "ma_phu_thu" };
const localDate = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const future = () => localDate(new Date(Date.now() + 86400000));
const asLocal = (value: unknown) => value ? localDate(new Date(String(value))) : "";
const utc = (value: string) => value ? new Date(value).toISOString().slice(0, 23) : null;
const field = (row: Policy, name: string) => String(row[name] ?? "");

function blank(type: PolicyType): Form {
  const dates = { hieu_luc_tu: future(), hieu_luc_den: "" };
  if (type === "CUOC") return { ...dates, ten: "", cuoc_co_ban: "20000", don_gia_km: "5000",
    km_toi_thieu: "0", km_toi_da: "30", kg_bao_gom: "1", kg_toi_da: "30", don_gia_kg: "3000" };
  if (type === "THANH_VIEN") return { ...dates, ma_hang: "BAC", ty_le_giam: "5" };
  return { ...dates, ten: "", ma_loai: "", so_tien: "0", bat_buoc: false };
}

function toForm(type: PolicyType, row: Policy): Form {
  const base = { hieu_luc_tu: asLocal(row.hieu_luc_tu), hieu_luc_den: asLocal(row.hieu_luc_den) };
  if (type === "CUOC") return { ...base, ten: field(row, "ten"), cuoc_co_ban: field(row, "cuoc_co_ban"),
    don_gia_km: field(row, "don_gia_km"), km_toi_thieu: field(row, "km_toi_thieu"),
    km_toi_da: field(row, "km_toi_da"), kg_bao_gom: field(row, "kg_bao_gom"),
    kg_toi_da: field(row, "kg_toi_da"), don_gia_kg: field(row, "don_gia_kg") };
  if (type === "THANH_VIEN") return { ...base, ma_hang: field(row, "ma_hang"), ty_le_giam: field(row, "ty_le_giam") };
  return { ...base, ten: field(row, "ten"), ma_loai: field(row, "ma_loai"),
    so_tien: field(row, "so_tien"), bat_buoc: Boolean(row.bat_buoc) };
}

function payload(type: PolicyType, form: Form): Record<string, string | number | boolean | null> {
  const result: Record<string, string | number | boolean | null> = {
    hieu_luc_tu: utc(String(form.hieu_luc_tu)), hieu_luc_den: utc(String(form.hieu_luc_den)),
  };
  const numeric = type === "CUOC" ? ["cuoc_co_ban", "don_gia_km", "km_toi_thieu", "km_toi_da", "kg_bao_gom", "kg_toi_da", "don_gia_kg"]
    : type === "THANH_VIEN" ? ["ty_le_giam"] : ["so_tien"];
  for (const key of numeric) result[key] = Number(form[key]);
  for (const key of type === "CUOC" ? ["ten"] : type === "THANH_VIEN" ? ["ma_hang"] : ["ten", "ma_loai"])
    result[key] = String(form[key]).trim();
  if (type === "PHU_THU") result.bat_buoc = Boolean(form.bat_buoc);
  return result;
}

export default function AdminFarePage() {
  const [type, setType] = useState<PolicyType>("CUOC");
  const [data, setData] = useState<Policies>({ fares: [], memberships: [], surcharges: [] });
  const [selected, setSelected] = useState("");
  const [form, setForm] = useState<Form>(() => blank("CUOC"));
  const [closeAt, setCloseAt] = useState(future);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const response = await request<Policies>("/policies");
    setData(response);
    return response;
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => { void refresh().catch(cause => setError((cause as Error).message)); }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const rows = type === "CUOC" ? data.fares : type === "THANH_VIEN" ? data.memberships : data.surcharges;
  const current = rows.find(row => field(row, idField[type]) === selected);
  const editable = !current || current.trang_thai === "NHAP";
  const set = (name: string, value: string | boolean) => setForm(previous => ({ ...previous, [name]: value }));
  const choose = (value: string) => {
    setSelected(value);
    setForm(value ? toForm(type, rows.find(row => field(row, idField[type]) === value)!) : blank(type));
    setError(""); setNotice("");
  };
  const chooseType = (value: PolicyType) => {
    setType(value); setSelected(""); setForm(blank(value)); setError(""); setNotice("");
  };

  async function action(hanhDong: "LUU_NHAP" | "CONG_BO" | "DONG_HIEU_LUC" | "XOA_NHAP") {
    if (busy) return;
    if (hanhDong === "LUU_NHAP" && (!String(form.hieu_luc_tu) ||
      Object.entries(payload(type, form)).some(([key, value]) => key !== "hieu_luc_den" &&
        (value === "" || value === null || typeof value === "number" && (!Number.isFinite(value) || value < 0))))) {
      setError("Điền đầy đủ các trường hợp lệ trước khi lưu bản nháp."); return;
    }
    if (hanhDong === "DONG_HIEU_LUC" && (!closeAt || new Date(closeAt) <= new Date())) {
      setError("Mốc đóng hiệu lực phải ở tương lai."); return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await request<Policies>("/policies", "POST", {
        hanhDong, loai: type, ma: selected || undefined,
        ...(hanhDong === "LUU_NHAP" ? { duLieu: payload(type, form) } : {}),
        ...(hanhDong === "DONG_HIEU_LUC" ? { den: utc(closeAt) } : {}),
      });
      setData(response);
      if (hanhDong === "XOA_NHAP") choose("");
      else if (!selected && hanhDong === "LUU_NHAP") {
        const updated = type === "CUOC" ? response.fares : type === "THANH_VIEN" ? response.memberships : response.surcharges;
        const created = updated.find(row => row.trang_thai === "NHAP" && !rows.some(old => field(old, idField[type]) === field(row, idField[type])));
        if (created) setSelected(field(created, idField[type]));
      }
      setNotice({ LUU_NHAP: "Đã lưu bản nháp trong cơ sở dữ liệu.", CONG_BO: "Đã công bố chính sách.",
        DONG_HIEU_LUC: "Đã đặt mốc đóng hiệu lực.", XOA_NHAP: "Đã xóa bản nháp." }[hanhDong]);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  const input = (name: string, label: string, kind = "number") => <div className="admin-field" key={name}>
    <label htmlFor={`policy-${name}`}>{label}</label>
    <input id={`policy-${name}`} type={kind} min={kind === "number" ? "0" : undefined}
      disabled={!editable || busy} value={String(form[name] ?? "")}
      onChange={event => set(name, event.target.value)} />
  </div>;

  return <>
    <AdminHeading eyebrow="Chính sách kinh doanh" title="Biểu phí & chính sách"
      description="Tạo bản nháp, công bố và đóng hiệu lực qua cơ sở dữ liệu." />
    {error && <p role="alert" className="admin-feedback error">{error}</p>}
    {notice && <p role="status" className="admin-feedback">{notice}</p>}
    <div className="admin-tabs" role="tablist" aria-label="Loại chính sách">
      {(["CUOC", "THANH_VIEN", "PHU_THU"] as const).map(item => <button key={item} role="tab"
        aria-selected={type === item} className={type === item ? "active" : ""}
        onClick={() => chooseType(item)}>{labels[item]}</button>)}
    </div>
    <section className="admin-panel"><div className="admin-section-head"><div><h2>{labels[type]}</h2>
      <p>Bản công bố giữ nguyên nội dung. Muốn thay đổi, tạo bản nháp mới rồi công bố tại mốc phù hợp.</p></div></div>
      <div className="admin-detail-body">
        <div className="admin-field"><label htmlFor="policy-version">Phiên bản</label>
          <select id="policy-version" value={selected} onChange={event => choose(event.target.value)}>
            <option value="">Tạo bản nháp mới</option>
            {rows.map(row => <option key={field(row, idField[type])} value={field(row, idField[type])}>
              {field(row, "ten") || field(row, "ma_hang") || field(row, "ma_loai")} · {row.trang_thai} · {new Date(String(row.hieu_luc_tu)).toLocaleString("vi-VN")}
            </option>)}
          </select>
        </div>
        <div className="admin-form-grid">
          {type !== "THANH_VIEN" && input("ten", "Tên", "text")}
          {type === "CUOC" && <>
            {input("cuoc_co_ban", "Cước cơ bản (VND)")}{input("don_gia_km", "Đơn giá km (VND)")}
            {input("km_toi_thieu", "Km tối thiểu")}{input("km_toi_da", "Km tối đa")}
            {input("kg_bao_gom", "Kg bao gồm")}{input("kg_toi_da", "Kg tối đa")}
            {input("don_gia_kg", "Đơn giá kg (VND)")}
          </>}
          {type === "THANH_VIEN" && <>
            <div className="admin-field"><label htmlFor="policy-tier">Hạng</label>
              <select id="policy-tier" disabled={!editable || busy} value={String(form.ma_hang)} onChange={event => set("ma_hang", event.target.value)}>
                <option value="BAC">Bạc</option><option value="VANG">Vàng</option><option value="KIM_CUONG">Kim cương</option>
              </select></div>{input("ty_le_giam", "Tỷ lệ giảm (%)")}
          </>}
          {type === "PHU_THU" && <>{input("ma_loai", "Mã loại", "text")}{input("so_tien", "Số tiền (VND)")}
            <label className="admin-checkbox"><input type="checkbox" disabled={!editable || busy} checked={Boolean(form.bat_buoc)}
              onChange={event => set("bat_buoc", event.target.checked)} /> Bắt buộc</label></>}
          {input("hieu_luc_tu", "Hiệu lực từ", "datetime-local")}
          {input("hieu_luc_den", "Hiệu lực đến (tùy chọn)", "datetime-local")}
        </div>
        <div className="admin-heading-actions" style={{ marginTop: 16 }}>
          {editable && <button type="button" className="admin-button primary" disabled={busy} onClick={() => void action("LUU_NHAP")}>Lưu bản nháp</button>}
          {current?.trang_thai === "NHAP" && <>
            <button type="button" className="admin-button" disabled={busy} onClick={() => void action("CONG_BO")}>Công bố</button>
            <button type="button" className="admin-button danger" disabled={busy} onClick={() => void action("XOA_NHAP")}>Xóa nháp</button>
          </>}
        </div>
        {current?.trang_thai === "CONG_BO" && !current.hieu_luc_den && <div className="admin-form-grid" style={{ marginTop: 20 }}>
          <div className="admin-field"><label htmlFor="policy-close">Đóng hiệu lực lúc</label>
            <input id="policy-close" type="datetime-local" value={closeAt} onChange={event => setCloseAt(event.target.value)} /></div>
          <button type="button" className="admin-button" disabled={busy} onClick={() => void action("DONG_HIEU_LUC")}>Đặt mốc đóng</button>
        </div>}
      </div>
    </section>
  </>;
}
