"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminEmpty, AdminHeading } from "@/components/admin/AdminUI";
import { dateTime, useAdminResource } from "@/lib/admin-live";
import { request } from "@/lib/api-client";

type Customer = { ma_kh: string; username: string; ho_ten: string; so_dien_thoai: string | null; email: string | null;
  dia_chi_mac_dinh: string | null; ma_hang: string; thanh_vien_tu: string | null; thanh_vien_den: string | null; trang_thai_tai_khoan: string };

export default function AdminCustomersPage() {
  const { data, error, loading, refresh } = useAdminResource<{ items: Customer[] }>("/admin/customers");
  const [actionError, setActionError] = useState("");
  async function toggle(customer: Customer) {
    setActionError("");
    try { await request(`/admin/customers/${customer.ma_kh}/status`, "POST", { hanhDong: customer.trang_thai_tai_khoan === "KHOA" ? "MO_KHOA" : "KHOA" }); await refresh(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "Không cập nhật được tài khoản"); }
  }
  return <>
    <AdminHeading eyebrow="Kinh doanh" title="Khách hàng" description="Hồ sơ, hạng thành viên, thời hạn và trạng thái tài khoản từ designV2."
      actions={<button className="admin-button" onClick={() => void refresh()}>Làm mới</button>} />
    {loading && <p role="status" className="admin-feedback">Đang tải khách hàng...</p>}
    {(error || actionError) && <p role="alert" className="admin-feedback error">{error || actionError}</p>}
    {data && <section className="admin-panel"><div className="admin-result-bar"><strong>{data.items.length} khách hàng</strong></div>
      {data.items.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Khách hàng</th><th>Hạng</th><th>Thành viên từ</th><th>Đến ngày</th><th>Tài khoản</th><th>Thao tác</th></tr></thead><tbody>
        {data.items.map((customer) => <tr key={customer.ma_kh}><td><Link href={`/admin/customers/${customer.ma_kh}`}><strong>{customer.ho_ten}</strong></Link><small>{customer.username} · {customer.so_dien_thoai ?? "Chưa có số điện thoại"}</small></td>
          <td>{customer.ma_hang}</td><td>{dateTime(customer.thanh_vien_tu)}</td><td>{dateTime(customer.thanh_vien_den)}</td><td>{customer.trang_thai_tai_khoan === "KHOA" ? "Đã khóa" : "Hoạt động"}</td>
          <td><div className="admin-inline-actions"><Link className="admin-button" href={`/admin/customers/${customer.ma_kh}`}>Chi tiết</Link><button className="admin-button" onClick={() => void toggle(customer)}>{customer.trang_thai_tai_khoan === "KHOA" ? "Mở khóa" : "Khóa"}</button></div></td></tr>)}
      </tbody></table></div> : <AdminEmpty title="Chưa có khách hàng" detail="Khách hàng đăng ký sẽ xuất hiện tại đây." />}
    </section>}
  </>;
}
