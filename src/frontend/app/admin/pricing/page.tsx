"use client";

import { useState } from "react";
import { useAdmin } from "@/components/admin/AdminProvider";
import { AdminHeading, adminActivity } from "@/components/admin/AdminUI";
import type { FareConfig, MemberDiscount } from "@/lib/admin-extras";
import { formatVND } from "@/lib/utils";

const tierText: Record<MemberDiscount["tier"], string> = { THUONG: "Thường", BAC: "Bạc", VANG: "Vàng" };

export default function AdminFarePage() {
  const { fare, discounts, updateDemo } = useAdmin();
  const [tab, setTab] = useState<"FARE" | "MEMBERS">("FARE");
  const [draftFare, setDraftFare] = useState<FareConfig | null>(null);
  const [draftDiscounts, setDraftDiscounts] = useState<MemberDiscount[] | null>(null);
  const [distance, setDistance] = useState(5);
  const [tier, setTier] = useState<MemberDiscount["tier"]>("VANG");
  const [withSurcharge, setWithSurcharge] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const currentFare = draftFare ?? fare;
  const currentDiscounts = draftDiscounts ?? discounts;
  const base = currentFare.baseFee + Math.max(0, distance - currentFare.includedKm) * currentFare.perKm;
  const surcharge = withSurcharge ? currentFare.surcharge : 0;
  const policy = currentDiscounts.find((item) => item.tier === tier);
  const discount = Math.min(policy?.maxDiscount ?? 0, Math.round((base + surcharge) * (policy?.percent ?? 0) / 100));
  const total = Math.max(0, base + surcharge - discount);
  const changeFare = (key: keyof FareConfig, value: number) => { setDraftFare({ ...currentFare, [key]: value }); setError(""); };
  const changeDiscount = (tier: MemberDiscount["tier"], key: "percent" | "maxDiscount", value: number) => { setDraftDiscounts(currentDiscounts.map((item) => item.tier === tier ? { ...item, [key]: value } : item)); setError(""); };
  const save = () => {
    if (tab === "FARE") {
      if (Object.values(currentFare).some((value) => !Number.isFinite(value) || value < 0) || currentFare.includedKm <= 0 || currentFare.maxKm <= currentFare.includedKm) { setError("Các giá trị phải không âm; khoảng cách tối đa cần lớn hơn số km đã bao gồm."); return; }
      updateDemo((previous) => ({ ...previous, fare: { ...currentFare }, activity: [adminActivity("Cập nhật biểu phí", `Cước cơ bản ${formatVND(currentFare.baseFee)}`), ...previous.activity] }));
      setDraftFare(null); setNotice("Đã lưu biểu phí demo.");
    } else {
      if (currentDiscounts.some((item) => !Number.isFinite(item.percent) || item.percent < 0 || item.percent > 100 || !Number.isFinite(item.maxDiscount) || item.maxDiscount < 0)) { setError("Tỷ lệ giảm phải từ 0 đến 100%; mức giảm tối đa không âm."); return; }
      updateDemo((previous) => ({ ...previous, discounts: currentDiscounts.map((item) => ({ ...item })), activity: [adminActivity("Cập nhật chính sách thành viên", "Đã lưu tỷ lệ và hạn mức ưu đãi"), ...previous.activity] }));
      setDraftDiscounts(null); setNotice("Đã lưu chính sách thành viên demo.");
    }
  };

  return <>
    <AdminHeading eyebrow="Chính sách kinh doanh" title="Biểu phí & thành viên" description="Điều chỉnh thông số demo và xem thử cước cho một chuyến giao." actions={<button className="admin-button primary" onClick={save}>Lưu thay đổi</button>} />
    {notice && <p className="admin-feedback" role="status">{notice}</p>}{error && <p className="admin-feedback error" role="alert">{error}</p>}
    <div className="admin-tabs" role="tablist" aria-label="Chính sách"><button role="tab" aria-selected={tab === "FARE"} className={tab === "FARE" ? "active" : ""} onClick={() => setTab("FARE")}>Biểu phí giao hàng</button><button role="tab" aria-selected={tab === "MEMBERS"} className={tab === "MEMBERS" ? "active" : ""} onClick={() => setTab("MEMBERS")}>Ưu đãi thành viên</button></div>
    <div className="admin-detail-grid"><section className="admin-panel"><div className="admin-section-head"><div><h2>{tab === "FARE" ? "Cấu hình cước" : "Chính sách theo hạng"}</h2><p>Thay đổi chỉ ảnh hưởng công cụ xem trước và dữ liệu quản trị demo.</p></div></div><div className="admin-detail-body">{tab === "FARE" ? <div className="admin-form-grid">{([ ["baseFee", "Cước cơ bản (VND)"], ["includedKm", "Số km đã bao gồm"], ["perKm", "Cước mỗi km tiếp theo (VND)"], ["maxKm", "Quãng đường tối đa (km)"], ["surcharge", "Phụ thu mẫu (VND)"] ] as [keyof FareConfig, string][]).map(([key, label]) => <div className="admin-field" key={key}><label htmlFor={`fare-${key}`}>{label}</label><input id={`fare-${key}`} type="number" min="0" value={currentFare[key]} onChange={(event) => changeFare(key, Number(event.target.value))} /></div>)}</div> : <div className="admin-policy-list">{currentDiscounts.map((item) => <div className="admin-policy-row" key={item.tier}><div><strong>Hạng {tierText[item.tier]}</strong><small>{item.tier === "THUONG" ? "Khách mới" : item.tier === "BAC" ? "Khách thường xuyên" : "Khách ưu tiên"}</small></div><div className="admin-field"><label htmlFor={`percent-${item.tier}`}>Tỷ lệ giảm (%)</label><input id={`percent-${item.tier}`} type="number" min="0" max="100" value={item.percent} onChange={(event) => changeDiscount(item.tier, "percent", Number(event.target.value))} /></div><div className="admin-field"><label htmlFor={`cap-${item.tier}`}>Tối đa (VND)</label><input id={`cap-${item.tier}`} type="number" min="0" value={item.maxDiscount} onChange={(event) => changeDiscount(item.tier, "maxDiscount", Number(event.target.value))} /></div></div>)}</div>}</div></section>
      <section className="admin-panel"><div className="admin-section-head"><div><h2>Xem thử báo giá</h2><p>Phép tính tham khảo từ cấu hình đang hiển thị.</p></div></div><div className="admin-detail-body"><div className="admin-form-grid"><div className="admin-field"><label htmlFor="fare-distance">Quãng đường (km)</label><input id="fare-distance" type="number" min="0" max={currentFare.maxKm} value={distance} onChange={(event) => setDistance(Math.max(0, Number(event.target.value)))} /></div><div className="admin-field"><label htmlFor="fare-tier">Hạng khách</label><select id="fare-tier" value={tier} onChange={(event) => setTier(event.target.value as MemberDiscount["tier"])}><option value="THUONG">Thường</option><option value="BAC">Bạc</option><option value="VANG">Vàng</option></select></div></div><label className="admin-checkbox"><input type="checkbox" checked={withSurcharge} onChange={(event) => setWithSurcharge(event.target.checked)} /> Áp dụng phụ thu mẫu</label><div className="admin-quote-lines"><div><span>Cước quãng đường</span><strong>{formatVND(base)}</strong></div><div><span>Phụ thu</span><strong>{formatVND(surcharge)}</strong></div><div><span>Ưu đãi {tierText[tier]}</span><strong>−{formatVND(discount)}</strong></div><div className="admin-quote-total"><span>Cước ước tính</span><strong>{formatVND(total)}</strong></div></div>{distance > currentFare.maxKm && <p className="admin-modal-error">Quãng đường vượt phạm vi cấu hình {currentFare.maxKm} km.</p>}<p className="admin-field-help">Báo giá thật sẽ do backend quyết định khi tích hợp.</p></div></section></div>
  </>;
}
