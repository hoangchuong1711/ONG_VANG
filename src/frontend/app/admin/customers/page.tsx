"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminEmpty, AdminHeading } from "@/components/admin/AdminUI";
import { AdminTableControls, useAdminTable } from "@/components/admin/AdminTableControls";
import { dateTime, useAdminResource } from "@/lib/admin-live";
import { request } from "@/lib/api-client";

type Customer = { ma_kh: string; username: string; ho_ten: string; so_dien_thoai: string | null; email: string | null; tham_gia_tu: string;
  dia_chi_mac_dinh: string | null; ma_hang: string; thanh_vien_tu: string | null; thanh_vien_den: string | null; trang_thai_tai_khoan: string };

function activeTier(customer: Customer): string {
  const now = Date.now();
  return customer.ma_hang !== "THUONG" && customer.thanh_vien_tu
    && new Date(customer.thanh_vien_tu).getTime() <= now
    && (!customer.thanh_vien_den || new Date(customer.thanh_vien_den).getTime() > now)
    ? customer.ma_hang : "THUONG";
}

export default function AdminCustomersPage() {
  const { data, error, loading, refresh } = useAdminResource<{ items: Customer[] }>("/admin/customers");
  const [actionError, setActionError] = useState("");
  const [tierDrafts, setTierDrafts] = useState<Record<string, string>>({});
  const [savingTier, setSavingTier] = useState<string | null>(null);
  const table = useAdminTable(data?.items ?? [], (customer) => `${customer.ho_ten} ${customer.username} ${customer.so_dien_thoai ?? ""} ${customer.ma_hang}`);
  async function toggle(customer: Customer) {
    setActionError("");
    try { await request(`/admin/customers/${customer.ma_kh}/status`, "POST", { hanhDong: customer.trang_thai_tai_khoan === "KHOA" ? "MO_KHOA" : "KHOA" }); await refresh(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "Không cập nhật được tài khoản"); }
  }
  async function saveTier(customer: Customer) {
    const tier = tierDrafts[customer.ma_kh] ?? activeTier(customer);
    setSavingTier(customer.ma_kh); setActionError("");
    try {
      await request(`/admin/customers/${customer.ma_kh}/membership`, "POST", { maHang: tier });
      setTierDrafts((current) => { const next = { ...current }; delete next[customer.ma_kh]; return next; });
      await refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Không gán được hạng thành viên");
    } finally { setSavingTier(null); }
  }
  return <>
    <AdminHeading eyebrow="Kinh doanh" title="Khách hàng" description="Hồ sơ, hạng thành viên, thời hạn và trạng thái tài khoản từ designV2."
      actions={<button className="admin-button" onClick={() => void refresh()}>Làm mới</button>} />
    {loading && <p role="status" className="admin-feedback">Đang tải khách hàng...</p>}
    {(error || actionError) && <p role="alert" className="admin-feedback error">{error || actionError}</p>}
    {data && <section className="admin-panel"><div className="admin-result-bar"><strong>{data.items.length} khách hàng</strong></div>
      <AdminTableControls label="khách hàng" query={table.query} onQuery={table.setQuery} page={table.page} onPage={table.setPage} total={table.total} />
      {table.rows.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Khách hàng</th><th>Thành viên từ</th><th>Hạng thành viên</th><th>Tài khoản</th><th>Thao tác</th></tr></thead><tbody>
        {table.rows.map((customer) => <tr key={customer.ma_kh}><td><Link href={`/admin/customers/${customer.ma_kh}`}><strong>{customer.ho_ten}</strong></Link><small>{customer.username} · {customer.so_dien_thoai ?? "Chưa có số điện thoại"}</small></td>
          <td>{dateTime(customer.tham_gia_tu)}</td>
          <td><div className="admin-inline-actions"><select aria-label={`Hạng thành viên của ${customer.ho_ten}`} disabled={customer.trang_thai_tai_khoan !== "HOAT_DONG" || savingTier !== null} value={tierDrafts[customer.ma_kh] ?? activeTier(customer)} onChange={(event) => setTierDrafts((current) => ({ ...current, [customer.ma_kh]: event.target.value }))}>
            <option value="THUONG">Thường</option><option value="BAC">Bạc</option><option value="VANG">Vàng</option><option value="KIM_CUONG">Kim cương</option>
          </select><button className="admin-button" disabled={customer.trang_thai_tai_khoan !== "HOAT_DONG" || savingTier !== null || (tierDrafts[customer.ma_kh] ?? activeTier(customer)) === activeTier(customer)} onClick={() => void saveTier(customer)}>{savingTier === customer.ma_kh ? "Đang lưu..." : "Lưu hạng"}</button></div></td>
          <td>{customer.trang_thai_tai_khoan === "KHOA" ? "Đã khóa" : "Hoạt động"}</td>
          <td><div className="admin-inline-actions"><Link className="admin-button" href={`/admin/customers/${customer.ma_kh}`}>Chi tiết</Link><button className="admin-button" onClick={() => void toggle(customer)}>{customer.trang_thai_tai_khoan === "KHOA" ? "Mở khóa" : "Khóa"}</button></div></td></tr>)}
      </tbody></table></div> : <AdminEmpty title="Chưa có khách hàng" detail="Khách hàng đăng ký sẽ xuất hiện tại đây." />}
    </section>}
  </>;
}
