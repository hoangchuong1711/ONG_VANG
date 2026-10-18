"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AdminHeading, AdminStat } from "@/components/admin/AdminUI";
import { amount, dateTime, orderStatus, useAdminResource } from "@/lib/admin-live";
import { request } from "@/lib/api-client";

type CustomerDetail = { ma_kh: string; username: string; ho_ten: string; so_dien_thoai: string | null; email: string | null;
  dia_chi_mac_dinh: string | null; ma_hang: string; thanh_vien_tu: string | null; thanh_vien_den: string | null;
  trang_thai_tai_khoan: string; tong_don: number; don_hang_page: number; don_hang_size: number;
  don_hang: { ma_don: string; tao_luc: string; trang_thai: string; tong_cuoc: string }[] };

export default function AdminCustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState(0);
  const { data, error, loading, refresh } = useAdminResource<CustomerDetail>(`/admin/customers/${id}?page=${page}&size=20`);
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  async function toggle() {
    if (!data) return;
    setSaving(true); setActionError("");
    try { await request(`/admin/customers/${id}/status`, "POST", { hanhDong: data.trang_thai_tai_khoan === "KHOA" ? "MO_KHOA" : "KHOA" }); await refresh(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "Không cập nhật được tài khoản"); }
    finally { setSaving(false); }
  }
  return <>
    <AdminHeading eyebrow="Khách hàng" title={data?.ho_ten ?? id} description="Hồ sơ thành viên và lịch sử đơn hàng từ designV2."
      actions={<><Link className="admin-button" href="/admin/customers">← Danh sách</Link><button className="admin-button" onClick={() => void refresh()}>Làm mới</button></>} />
    {loading && <p role="status" className="admin-feedback">Đang tải hồ sơ khách hàng...</p>}
    {(error || actionError) && <p role="alert" className="admin-feedback error">{error || actionError}</p>}
    {data && <>
      <div className="admin-stat-grid"><AdminStat label="Hạng thành viên" value={data.ma_hang} note={data.ma_hang === "THUONG" ? "Khách thường" : `Từ ${dateTime(data.thanh_vien_tu)} đến ${dateTime(data.thanh_vien_den)}`} />
        <AdminStat label="Tổng đơn" value={Number(data.tong_don)} note="Toàn bộ lịch sử đặt hàng" />
        <AdminStat label="Tài khoản" value={data.trang_thai_tai_khoan === "KHOA" ? "Đã khóa" : "Hoạt động"} note="Khóa sẽ thu hồi các phiên hiện tại" tone={data.trang_thai_tai_khoan === "KHOA" ? "alert" : undefined} />
      </div>
      <section className="admin-panel admin-extra-detail"><div className="admin-section-head"><h2>Thông tin tài khoản</h2><button className="admin-button" disabled={saving} onClick={() => void toggle()}>{saving ? "Đang lưu..." : data.trang_thai_tai_khoan === "KHOA" ? "Mở khóa tài khoản" : "Khóa tài khoản"}</button></div>
        <div className="admin-detail-body"><p><strong>Tên đăng nhập:</strong> {data.username}</p><p><strong>Số điện thoại:</strong> {data.so_dien_thoai ?? "—"}</p><p><strong>Email:</strong> {data.email ?? "—"}</p><p><strong>Địa chỉ:</strong> {data.dia_chi_mac_dinh ?? "—"}</p></div>
      </section>
      <section className="admin-panel admin-extra-detail"><div className="admin-section-head"><h2>Đơn hàng</h2><span>{Number(data.tong_don)} đơn</span></div>
        {data.don_hang.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Mã đơn</th><th>Tạo lúc</th><th>Trạng thái</th><th className="money">Cước</th></tr></thead><tbody>
          {data.don_hang.map((order) => <tr key={order.ma_don}><td><Link href={`/admin/orders/${order.ma_don}`}>{order.ma_don}</Link></td><td>{dateTime(order.tao_luc)}</td><td>{orderStatus[order.trang_thai] ?? order.trang_thai}</td><td className="money">{amount(order.tong_cuoc)}</td></tr>)}
        </tbody></table></div> : <p className="admin-muted">Khách hàng chưa có đơn hàng ở trang này.</p>}
        <div className="admin-inline-actions"><button className="admin-button" disabled={page === 0} onClick={() => setPage(page - 1)}>Trang trước</button>
          <button className="admin-button" disabled={(page + 1) * 20 >= Number(data.tong_don)} onClick={() => setPage(page + 1)}>Trang sau</button></div>
      </section>
    </>}
  </>;
}
