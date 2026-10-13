"use client";

import { useState } from "react";
import { useAdmin } from "@/components/admin/AdminProvider";
import { AdminEmpty, AdminHeading, adminActivity } from "@/components/admin/AdminUI";
import type { AdminSettings } from "@/lib/admin-extras";

export default function AdminSettingsPage() {
  const { settings, activity, events, updateDemo } = useAdmin();
  const [draft, setDraft] = useState<AdminSettings | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const form = draft ?? settings;
  const change = <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => { setDraft({ ...form, [key]: value }); setError(""); };
  const save = () => {
    if (form.fleetName.trim().length < 3 || form.hotline.trim().length < 8 || !/^\S+@\S+\.\S+$/.test(form.email)) { setError("Nhập tên đội xe, hotline và email hợp lệ."); return; }
    updateDemo((previous) => ({ ...previous, settings: { ...form }, activity: [adminActivity("Cập nhật cài đặt", "Thông tin đội xe và tùy chọn thông báo"), ...previous.activity] }));
    setDraft(null); setNotice("Đã lưu cài đặt demo.");
  };
  const log = [...activity, ...events.map((event) => ({ id: event.id, title: event.title, detail: `${event.orderId} · ${event.detail}`, at: event.at }))].sort((a, b) => b.at.localeCompare(a.at));

  return <>
    <AdminHeading eyebrow="Quản trị hệ thống" title="Cài đặt" description="Thông tin đội xe, khu vực phục vụ và lịch sử thao tác demo." actions={<button className="admin-button primary" onClick={save}>Lưu cài đặt</button>} />
    {notice && <p className="admin-feedback" role="status">{notice}</p>}{error && <p className="admin-feedback error" role="alert">{error}</p>}
    <div className="admin-detail-grid"><section className="admin-panel"><div className="admin-section-head"><div><h2>Thông tin đội xe</h2><p>Thông tin sẽ hiển thị trong cổng quản trị.</p></div></div><div className="admin-detail-body"><div className="admin-form-grid"><div className="admin-field"><label htmlFor="settings-name">Tên đội xe</label><input id="settings-name" value={form.fleetName} onChange={(event) => change("fleetName", event.target.value)} /></div><div className="admin-field"><label htmlFor="settings-hotline">Hotline</label><input id="settings-hotline" value={form.hotline} onChange={(event) => change("hotline", event.target.value)} /></div><div className="admin-field"><label htmlFor="settings-email">Email hỗ trợ</label><input id="settings-email" type="email" value={form.email} onChange={(event) => change("email", event.target.value)} /></div><div className="admin-field admin-field-wide"><label htmlFor="settings-address">Địa chỉ</label><input id="settings-address" value={form.address} onChange={(event) => change("address", event.target.value)} /></div><div className="admin-field admin-field-wide"><label htmlFor="settings-area">Khu vực phục vụ</label><input id="settings-area" value={form.serviceArea} onChange={(event) => change("serviceArea", event.target.value)} /></div></div></div></section>
      <section className="admin-panel"><div className="admin-section-head"><div><h2>Thông báo quản trị</h2><p>Tùy chọn hiển thị trong bản demo.</p></div></div><div className="admin-detail-body"><label className="admin-setting-toggle"><span><strong>Thông báo sự cố</strong><small>Nhắc khi có đơn cần can thiệp</small></span><input type="checkbox" checked={form.notifyIncident} onChange={(event) => change("notifyIncident", event.target.checked)} /></label><label className="admin-setting-toggle"><span><strong>Thông báo thanh toán</strong><small>Nhắc khi có cước chưa thu</small></span><input type="checkbox" checked={form.notifyPayment} onChange={(event) => change("notifyPayment", event.target.checked)} /></label><div className="admin-inline-note" style={{ marginTop: 18 }}>Thông báo ngoài trình duyệt và gửi email sẽ được triển khai khi có backend.</div></div></section></div>
    <section className="admin-panel admin-extra-detail"><div className="admin-section-head"><div><h2>Nhật ký thao tác</h2><p>Các thay đổi thực hiện trong cổng quản trị demo này.</p></div><span className="admin-demo-pill">{log.length} mục</span></div>{log.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Thời gian</th><th>Thao tác</th><th>Nội dung</th></tr></thead><tbody>{log.map((event) => <tr key={event.id}><td>{new Date(event.at).toLocaleString("vi-VN")}</td><td><strong>{event.title}</strong></td><td>{event.detail}</td></tr>)}</tbody></table></div> : <AdminEmpty title="Chưa có thao tác nào" detail="Các thay đổi ở đơn hàng, đội xe và chính sách sẽ xuất hiện tại đây." />}</section>
  </>;
}
