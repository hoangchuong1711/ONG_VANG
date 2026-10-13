"use client";

import { useMemo, useState } from "react";
import { useAdmin } from "@/components/admin/AdminProvider";
import { AdminEmpty, AdminHeading, AdminStat } from "@/components/admin/AdminUI";
import { formatVND } from "@/lib/utils";

type Group = "NGAY" | "TUAN" | "THANG";
type Row = { key: string; count: number; completed: number; cancelled: number; value: number; collected: number; due: number };
const vietnamDate = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" });
const dateKey = (time: number) => {
  const parts = Object.fromEntries(vietnamDate.formatToParts(new Date(time)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};
const groupKey = (key: string, group: Group) => {
  if (group === "NGAY") return key;
  if (group === "THANG") return key.slice(0, 7);
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
};
const toCsv = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

export default function AdminReportPage() {
  const { orders } = useAdmin();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [group, setGroup] = useState<Group>("NGAY");
  const [notice, setNotice] = useState("");
  const invalid = Boolean(from && to && from > to);
  const relevant = useMemo(() => orders.filter((order) => {
    const key = dateKey(order.createdTimestamp);
    return (!from || key >= from) && (!to || key <= to);
  }), [orders, from, to]);
  const rows = useMemo(() => {
    const map = new Map<string, Row>();
    for (const order of relevant) {
      const key = groupKey(dateKey(order.createdTimestamp), group);
      const row = map.get(key) ?? { key, count: 0, completed: 0, cancelled: 0, value: 0, collected: 0, due: 0 };
      row.count += 1;
      if (order.status === "DA_HUY") row.cancelled += 1;
      if (["HOAN_TAT", "CHUA_THANH_TOAN"].includes(order.status)) {
        row.completed += 1; row.value += order.totalFee;
        if (order.paid) row.collected += order.totalFee; else row.due += order.totalFee;
      }
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [relevant, group]);
  const totals = rows.reduce((result, row) => ({ count: result.count + row.count, completed: result.completed + row.completed, cancelled: result.cancelled + row.cancelled, value: result.value + row.value, collected: result.collected + row.collected, due: result.due + row.due }), { count: 0, completed: 0, cancelled: 0, value: 0, collected: 0, due: 0 });
  const maxValue = Math.max(1, ...rows.map((row) => row.value));
  const exportCsv = () => {
    const header = ["Kỳ", "Tổng đơn", "Đơn hoàn tất", "Đơn hủy", "Giá trị hoàn tất (VND)", "Đã thu (VND)", "Còn phải thu (VND)"];
    const data = rows.map((row) => [row.key, row.count, row.completed, row.cancelled, row.value, row.collected, row.due]);
    data.push(["Tổng", totals.count, totals.completed, totals.cancelled, totals.value, totals.collected, totals.due]);
    const csv = "\uFEFF" + [header, ...data].map((line) => line.map(toCsv).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `bao-cao-mini-ong-vang-${from || "tat-ca"}-${to || "tat-ca"}.csv`; link.click();
    URL.revokeObjectURL(url);
    setNotice("Đã tải báo cáo CSV theo bộ lọc đang xem.");
  };

  return <>
    <AdminHeading eyebrow="Tài chính đội xe" title="Báo cáo" description="So sánh giá trị đơn hoàn tất, cước đã thu và khoản còn phải thu." actions={<button className="admin-button primary" disabled={invalid || rows.length === 0} onClick={exportCsv}>Tải báo cáo CSV</button>} />
    {notice && <p role="status" className="admin-feedback">{notice}</p>}
    <section className="admin-panel admin-filter-panel"><div className="admin-filter-grid admin-report-filters"><div className="admin-field"><label htmlFor="report-from">Từ ngày</label><input id="report-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></div><div className="admin-field"><label htmlFor="report-to">Đến ngày</label><input id="report-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></div><div className="admin-field"><label htmlFor="report-group">Nhóm theo</label><select id="report-group" value={group} onChange={(event) => setGroup(event.target.value as Group)}><option value="NGAY">Ngày</option><option value="TUAN">Tuần</option><option value="THANG">Tháng</option></select></div><button className="admin-filter-reset" onClick={() => { setFrom(""); setTo(""); setGroup("NGAY"); }}>Xóa lọc</button></div>{invalid && <p role="alert" className="admin-modal-error">Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.</p>}</section>
    <div className="admin-stat-grid"><AdminStat label="Giá trị đơn hoàn tất" value={formatVND(totals.value)} note={`${totals.completed} đơn hoàn tất`} tone="accent" /><AdminStat label="Tiền đã thu" value={formatVND(totals.collected)} note="Trong các đơn hoàn tất" /><AdminStat label="Cước còn phải thu" value={formatVND(totals.due)} note="Chưa xác nhận thanh toán" tone="alert" /><AdminStat label="Đơn hủy" value={totals.cancelled} note="Trong kỳ đã chọn" /></div>
    <div className="admin-main-grid"><section className="admin-panel"><div className="admin-section-head"><div><h2>Giá trị hoàn tất theo kỳ</h2><p>Phân nhóm theo thời điểm tạo của dữ liệu demo</p></div></div><div className="admin-chart">{rows.length && !invalid ? rows.map((row) => <div className="admin-chart-row admin-report-bar" key={row.key}><span>{row.key}</span><div className="admin-chart-track" role="img" aria-label={`${row.key}: ${formatVND(row.value)}`}><div className="admin-chart-fill" style={{ width: `${row.value / maxValue * 100}%` }} /></div><strong>{formatVND(row.value)}</strong></div>) : <AdminEmpty title="Không có số liệu" detail="Chọn khoảng ngày khác để xem báo cáo." />}</div></section><section className="admin-panel"><div className="admin-section-head"><h2>Cách đọc số liệu</h2></div><div className="admin-detail-body admin-report-explain"><p><strong>Giá trị hoàn tất</strong> là tổng cước của đơn đã giao xong trong dữ liệu demo.</p><p><strong>Tiền đã thu</strong> chỉ tính những đơn hoàn tất đã được ghi nhận thanh toán.</p><p><strong>Còn phải thu</strong> là phần cước của đơn hoàn tất chưa thu. Báo cáo này đang dùng thời điểm tạo đơn demo để phân nhóm.</p></div></section></div>
    <section className="admin-panel"><div className="admin-section-head"><div><h2>Bảng số liệu</h2><p>{group === "TUAN" ? "Mốc tuần bắt đầu từ thứ Hai" : `Phân nhóm theo ${group === "NGAY" ? "ngày" : "tháng"}`}</p></div></div>{rows.length && !invalid ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Kỳ</th><th>Tổng đơn</th><th>Hoàn tất</th><th>Hủy</th><th className="money">Giá trị hoàn tất</th><th className="money">Đã thu</th><th className="money">Còn phải thu</th></tr></thead><tbody>{rows.map((row) => <tr key={row.key}><td><strong>{row.key}</strong></td><td>{row.count}</td><td>{row.completed}</td><td>{row.cancelled}</td><td className="money">{formatVND(row.value)}</td><td className="money">{formatVND(row.collected)}</td><td className="money">{formatVND(row.due)}</td></tr>)}</tbody><tfoot><tr><th>Tổng</th><th>{totals.count}</th><th>{totals.completed}</th><th>{totals.cancelled}</th><th className="money">{formatVND(totals.value)}</th><th className="money">{formatVND(totals.collected)}</th><th className="money">{formatVND(totals.due)}</th></tr></tfoot></table></div> : <AdminEmpty title="Không có dữ liệu báo cáo" detail="Hãy thay đổi khoảng ngày hoặc xóa bộ lọc." />}</section>
  </>;
}
