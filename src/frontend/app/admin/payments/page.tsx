"use client";

import { useState } from "react";

import { AdminEmpty, AdminHeading, AdminStat } from "@/components/admin/AdminUI";
import { amount, dateTime, type FinanceRow, useAdminResource } from "@/lib/admin-live";

type Payment = {
  ma_giao_dich: string; ho_ten: string; ma_tham_chieu: string; trang_thai: string;
  so_tien_yeu_cau: string; so_tien_thuc_nhan: string | null;
  so_don_dang_lien_ket: number; tong_khoan_lien_ket: string;
  tao_luc: string; giai_quyet_luc: string | null;
  nguon_xac_minh: string | null; ket_qua_xac_minh: string | null;
  xac_minh_luc: string | null; can_doi_soat: boolean;
};
type Payments = FinanceRow & {
  giao_dich: Payment[]; giao_dich_total: number; giao_dich_page: number; giao_dich_size: number;
};

const statusLabel: Record<string, string> = {
  CHO_XU_LY: "Chờ xử lý", CHUA_RO_KET_QUA: "Chưa rõ kết quả",
  THANH_CONG: "Thành công", KHONG_THU: "Xác minh không thu",
};

type PaymentEvent = {
  ma_su_kien: number; nguon: string; chu_ky_hop_le: boolean;
  ket_qua: string; nhan_luc: string;
};

function PaymentEvents({ paymentId }: { paymentId: string }) {
  const { data, error, loading } = useAdminResource<{ items: PaymentEvent[] }>(
    `/admin/payments/${encodeURIComponent(paymentId)}/events`,
  );
  if (loading) return <p role="status">Đang tải sự kiện...</p>;
  if (error) return <p role="alert" className="admin-feedback error">{error}</p>;
  if (!data?.items.length) return <p>Chưa có sự kiện xác minh.</p>;
  return <ul>{data.items.map((event) => <li key={event.ma_su_kien}>
    {dateTime(event.nhan_luc)} · {event.nguon} · {event.ket_qua}
    {!event.chu_ky_hop_le && " · Chữ ký không hợp lệ"}
  </li>)}</ul>;
}

export default function AdminPaymentsPage() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("ALL");
  const query = `page=${page}&size=20${status === "ALL" ? "" : `&status=${encodeURIComponent(status)}`}`;
  const { data, error, loading, refresh } = useAdminResource<Payments>(`/admin/payments?${query}`);
  const [expanded, setExpanded] = useState<string | null>(null);
  return <>
    <AdminHeading eyebrow="Tài chính" title="Tài xế nộp tiền công ty"
      description="Số dư và giao dịch VNPay đọc từ designV2. Giao dịch chờ chưa được tính là đã nhận."
      actions={<button className="admin-button" onClick={() => void refresh()}>Làm mới</button>} />
    {loading && <p role="status" className="admin-feedback">Đang tải giao dịch...</p>}
    {error && <p role="alert" className="admin-feedback error">{error}</p>}
    {data && <>
      <div className="admin-stat-grid">
        <AdminStat label="Công ty được hưởng" value={amount(data.cong_ty_duoc_huong)} note="Từ đơn hoàn tất" />
        <AdminStat label="Đã nhận qua VNPay" value={amount(data.da_nop)} note="Chỉ giao dịch thành công" tone="accent" />
        <AdminStat label="Còn phải nộp" value={amount(data.con_phai_nop)} note="Gồm cả khoản đang thanh toán" tone="alert" />
        <AdminStat label="Đang thanh toán" value={amount(data.dang_thanh_toan)} note="Chưa được tính là đã nhận" />
      </div>
      <section className="admin-panel"><div className="admin-section-head"><h2>Theo tài xế</h2></div>
        {data.tai_xe.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr>
          <th>Tài xế</th><th className="money">Công ty được hưởng</th><th className="money">Đã nhận</th>
          <th className="money">Đang thanh toán</th><th className="money">Khoản mới</th><th className="money">Còn phải nộp</th>
        </tr></thead><tbody>{data.tai_xe.map((driver) => <tr key={driver.ma_tx}>
          <td>{driver.ho_ten}</td><td className="money">{amount(driver.cong_ty_duoc_huong)}</td>
          <td className="money">{amount(driver.da_nop)}</td><td className="money">{amount(driver.dang_thanh_toan)}</td>
          <td className="money">{amount(driver.chua_dua_vao_thanh_toan)}</td>
          <td className="money">{amount(driver.con_phai_nop)}</td>
        </tr>)}</tbody></table></div> : <AdminEmpty title="Chưa có tài xế" detail="Chưa có hồ sơ tài xế trong DB." />}
      </section>
      <section className="admin-panel"><div className="admin-section-head"><h2>Giao dịch nộp tiền</h2></div>
        <div className="admin-field"><label htmlFor="payment-status">Trạng thái</label>
          <select id="payment-status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); setExpanded(null); }}>
            <option value="ALL">Tất cả</option>
            {Object.entries(statusLabel).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            <option value="CAN_DOI_SOAT">Cần đối soát</option>
          </select>
        </div>
        <p>{Number(data.giao_dich_total)} giao dịch · Trang {page + 1}</p>
        {data.giao_dich.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr>
          <th>Tạo lúc</th><th>Tài xế</th><th>Tham chiếu</th><th>Trạng thái</th>
          <th>Xác minh gần nhất</th><th className="money">Yêu cầu</th><th className="money">Đã nhận</th>
        </tr></thead><tbody>{data.giao_dich.map((item) => <tr key={item.ma_giao_dich}>
          <td>{dateTime(item.tao_luc)}</td><td>{item.ho_ten}</td><td>{item.ma_tham_chieu}<small>{item.so_don_dang_lien_ket} đơn liên kết</small></td>
          <td>{statusLabel[item.trang_thai] ?? item.trang_thai}{item.can_doi_soat && <small>Cần đối soát</small>}</td>
          <td>{item.ket_qua_xac_minh ?? "Chưa có"}<small>{item.nguon_xac_minh ?? ""} {dateTime(item.xac_minh_luc)}</small>
            <button className="admin-button" type="button" onClick={() => setExpanded(expanded === item.ma_giao_dich ? null : item.ma_giao_dich)}>
              {expanded === item.ma_giao_dich ? "Ẩn sự kiện" : "Xem sự kiện"}
            </button>
            {expanded === item.ma_giao_dich && <PaymentEvents paymentId={item.ma_giao_dich} />}
          </td>
          <td className="money">{amount(item.so_tien_yeu_cau)}</td>
          <td className="money">{item.so_tien_thuc_nhan == null ? "—" : amount(item.so_tien_thuc_nhan)}</td>
        </tr>)}</tbody></table></div> : <AdminEmpty title="Không có giao dịch phù hợp" detail="Thử đổi trạng thái hoặc quay lại trang trước." />}
        <div className="admin-inline-actions">
          <button className="admin-button" disabled={page === 0} onClick={() => { setPage(page - 1); setExpanded(null); }}>Trang trước</button>
          <button className="admin-button" disabled={(page + 1) * 20 >= Number(data.giao_dich_total)} onClick={() => { setPage(page + 1); setExpanded(null); }}>Trang sau</button>
        </div>
      </section>
    </>}
  </>;
}
