"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AdminEmpty, AdminHeading, AdminStat } from "@/components/admin/AdminUI";
import { amount, useAdminResource } from "@/lib/admin-live";

type DriverLine = {
  maTx: string; hoTen: string; congTyPhatSinh: string;
  thuNhapTaiXePhatSinh: string; daNhanVnpay: string; conPhaiNopCuoiKy: string;
};
type PeriodReport = {
  tuNgay: string; denNgayKhongGom: string; muiGio: string;
  congTyPhatSinh: string; thuNhapTaiXePhatSinh: string;
  daNhanVnpay: string; conPhaiNopCuoiKy: string; taiXe: DriverLine[];
};

function vietnamDay(offset: number) {
  const day = new Date(Date.now() + offset * 86_400_000);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(day);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function ReportResult({ from, until }: { from: string; until: string }) {
  const query = `tu=${encodeURIComponent(from)}&den=${encodeURIComponent(until)}`;
  const { data, error, loading, refresh } = useAdminResource<PeriodReport>(`/admin/reports/finance?${query}`);
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);

  async function download() {
    setExportError(""); setExporting(true);
    try {
      const response = await fetch(`/api/v2/admin/reports/finance.xlsx?${query}`, {
        credentials: "same-origin", cache: "no-store",
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message ?? "Không xuất được báo cáo");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `finance-v2-${from}-${until}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (cause) {
      setExportError(cause instanceof Error ? cause.message : "Không xuất được báo cáo");
    } finally { setExporting(false); }
  }

  return <>
    <div className="admin-inline-actions">
      <button className="admin-button" onClick={() => void refresh()}>Làm mới</button>
      <button className="admin-button" disabled={!data || exporting} onClick={() => void download()}>
        {exporting ? "Đang xuất..." : "Xuất Excel"}
      </button>
    </div>
    {loading && <p role="status" className="admin-feedback">Đang tải báo cáo...</p>}
    {error && <p role="alert" className="admin-feedback error">{error}</p>}
    {exportError && <p role="alert" className="admin-feedback error">{exportError}</p>}
    {data && <>
      <p className="admin-feedback">Kỳ {data.tuNgay} đến trước {data.denNgayKhongGom} ({data.muiGio}). Công nợ là số dư tại cuối kỳ, không cộng các kỳ.</p>
      <div className="admin-stat-grid">
        <AdminStat label="Công ty phát sinh trong kỳ" value={amount(data.congTyPhatSinh)} note="Theo thời điểm hoàn tất đơn" />
        <AdminStat label="Đã nhận VNPay trong kỳ" value={amount(data.daNhanVnpay)} note="Theo thời điểm xác minh thành công" tone="accent" />
        <AdminStat label="Còn phải nộp cuối kỳ" value={amount(data.conPhaiNopCuoiKy)} note="Số dư tại mốc kết thúc" tone="alert" />
        <AdminStat label="Thu nhập tài xế phát sinh" value={amount(data.thuNhapTaiXePhatSinh)} note="80% cước đã hoàn tất" />
      </div>
      <section className="admin-panel"><div className="admin-section-head"><h2>Theo tài xế</h2></div>
        {data.taiXe.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr>
          <th>Tài xế</th><th className="money">Công ty phát sinh</th><th className="money">Tài xế phát sinh</th>
          <th className="money">VNPay đã nhận</th><th className="money">Còn phải nộp cuối kỳ</th>
        </tr></thead><tbody>{data.taiXe.map((driver) => <tr key={driver.maTx}>
          <td>{driver.hoTen}</td><td className="money">{amount(driver.congTyPhatSinh)}</td>
          <td className="money">{amount(driver.thuNhapTaiXePhatSinh)}</td>
          <td className="money">{amount(driver.daNhanVnpay)}</td>
          <td className="money">{amount(driver.conPhaiNopCuoiKy)}</td>
        </tr>)}</tbody></table></div> : <AdminEmpty title="Chưa có tài xế" detail="Chưa có hồ sơ tài xế trong DB." />}
      </section>
    </>}
  </>;
}

export default function AdminReportsPage() {
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [applied, setApplied] = useState<{ from: string; until: string } | null>(null);
  const [inputError, setInputError] = useState("");
  useEffect(() => {
    const start = vietnamDay(-29), end = vietnamDay(1);
    setFrom(start); setUntil(end); setApplied({ from: start, until: end });
  }, []);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!from || !until || until <= from) {
      setInputError("Ngày kết thúc phải sau ngày bắt đầu."); return;
    }
    setInputError(""); setApplied({ from, until });
  }

  return <>
    <AdminHeading eyebrow="Tài chính" title="Báo cáo đội xe"
      description="Báo cáo designV2 theo kỳ, dùng chung số liệu cho màn hình và Excel." />
    <form className="admin-panel admin-filter-panel" onSubmit={apply}>
      <div className="admin-filter-grid">
        <div className="admin-field"><label htmlFor="report-from">Từ ngày</label>
          <input id="report-from" type="date" required value={from} onChange={(event) => setFrom(event.target.value)} /></div>
        <div className="admin-field"><label htmlFor="report-until">Trước ngày</label>
          <input id="report-until" type="date" required value={until} onChange={(event) => setUntil(event.target.value)} /></div>
      </div>
      <button className="admin-button" type="submit">Xem báo cáo</button>
      {inputError && <p role="alert" className="admin-feedback error">{inputError}</p>}
    </form>
    {applied && <ReportResult key={`${applied.from}-${applied.until}`} {...applied} />}
  </>;
}
