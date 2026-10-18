"use client";

import Link from "next/link";
import { AdminEmpty, AdminHeading, AdminStat } from "@/components/admin/AdminUI";
import { amount, dateTime, orderStatus, useAdminResource } from "@/lib/admin-live";

type Overview = {
  tong_don: number; cho_gan: number | null; dang_xu_ly: number | null;
  hoan_tat: number | null; da_huy: number | null;
  tai_chinh: { cong_ty_duoc_huong: string; da_nop: string; con_phai_nop: string };
  don_gan_day: { ma_don: string; tao_luc: string; trang_thai: string; ten_nguoi_nhan: string;
    tong_cuoc: string; tai_xe: string | null }[];
};

export default function AdminOverviewPage() {
  const { data, error, loading, refresh } = useAdminResource<Overview>("/admin/overview");
  return <>
    <AdminHeading eyebrow="Điều hành" title="Tổng quan đội xe" description="Số liệu trực tiếp từ cơ sở dữ liệu designV2."
      actions={<button className="admin-button" onClick={() => void refresh()}>Làm mới</button>} />
    {loading && <p role="status" className="admin-feedback">Đang tải số liệu...</p>}
    {error && <p role="alert" className="admin-feedback error">{error}</p>}
    {data && <>
      <div className="admin-stat-grid">
        <AdminStat label="Tổng đơn" value={Number(data.tong_don)} note="Toàn bộ lịch sử" />
        <AdminStat label="Chờ gán" value={Number(data.cho_gan ?? 0)} note="Cần phân công" tone="accent" />
        <AdminStat label="Đang xử lý" value={Number(data.dang_xu_ly ?? 0)} note="Đã gán hoặc đang giao" />
        <AdminStat label="Hoàn tất" value={Number(data.hoan_tat ?? 0)} note="Đã giao và thu đủ" />
      </div>
      <div className="admin-stat-grid">
        <AdminStat label="Công ty được hưởng" value={amount(data.tai_chinh.cong_ty_duoc_huong)} note="Từ đơn hoàn tất" />
        <AdminStat label="Đã nhận qua VNPay" value={amount(data.tai_chinh.da_nop)} note="Giao dịch thành công" tone="accent" />
        <AdminStat label="Còn phải nộp" value={amount(data.tai_chinh.con_phai_nop)} note="Gồm khoản đang thanh toán" tone="alert" />
        <AdminStat label="Đơn đã hủy" value={Number(data.da_huy ?? 0)} note="Toàn bộ lịch sử" />
      </div>
      <section className="admin-panel"><div className="admin-section-head"><h2>Đơn gần đây</h2><Link href="/admin/orders">Xem tất cả →</Link></div>
        {data.don_gan_day.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Mã đơn</th><th>Người nhận</th><th>Tài xế</th><th>Trạng thái</th><th className="money">Cước</th></tr></thead><tbody>
          {data.don_gan_day.map((order) => <tr key={order.ma_don}><td><Link href={`/admin/orders/${order.ma_don}`}>{order.ma_don}</Link><small>{dateTime(order.tao_luc)}</small></td><td>{order.ten_nguoi_nhan}</td><td>{order.tai_xe ?? "Chưa gán"}</td><td>{orderStatus[order.trang_thai] ?? order.trang_thai}</td><td className="money">{amount(order.tong_cuoc)}</td></tr>)}
        </tbody></table></div> : <AdminEmpty title="Chưa có đơn hàng" detail="Đơn mới sẽ xuất hiện tại đây." />}
      </section>
    </>}
  </>;
}
