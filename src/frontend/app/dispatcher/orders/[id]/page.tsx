"use client";
import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { dispatchApi, dateTime, money } from "@/lib/api/dispatch";
import { useResource } from "@/lib/api/use-resource";
import { DispatchShell, ErrorNotice, Status } from "@/components/dispatcher/Views";
import { OrderActions } from "@/components/dispatcher/OrderActions";
export default function DispatcherOrder() {
  const { id } = useParams<{ id: string }>();
  const [revision, setRevision] = useState(0);
  const [actionError, setActionError] = useState<unknown>();
  const load = useCallback((signal: AbortSignal) => dispatchApi.detail(id, signal), [id]);
  const resource = useResource(`${id}:${revision}`, load);
  const refresh = () => setRevision((value) => value + 1);
  const changed = (error?: unknown) => { setActionError(error); refresh(); };
  const order = resource.data?.maDon === id ? resource.data : undefined;
  // A current assignment comes from backend assignment history, never local demo state.
  const active = order?.phanCong.find((assignment) => assignment.ketThucLuc === null);
  const shownDriver = active?.maTx ?? order?.maTx;
  return <DispatchShell>
    <Link href="/dispatcher" className="text-amber-800 underline">← Bàn điều phối</Link>
    <div className="flex flex-wrap gap-3 items-center justify-between"><h1 className="text-3xl font-extrabold">Chi tiết đơn {id}</h1><button className="dispatch-button secondary" disabled={resource.loading} onClick={refresh}>Làm mới đơn</button></div>
    {resource.loading && <p role="status">Đang tải chi tiết đơn…</p>}
    {actionError ? <ErrorNotice error={actionError} /> : null}
    {resource.error ? <ErrorNotice error={resource.error} retry={refresh} /> : null}
    {order && <>
      <section className="dispatch-panel space-y-4" aria-busy={resource.loading}>
        <div className="flex flex-wrap gap-3 justify-between"><Status order={order} /><OrderActions order={order} changed={changed} loading={resource.loading || !!resource.error} /></div>
        <dl className="grid sm:grid-cols-2 gap-4">
          {[["Điểm lấy", order.diemLayHang], ["Điểm giao", order.diemGiaoHang], ["SĐT người nhận", order.sdtNguoiNhan], ["Khách hàng", order.maKh], ["Người tạo", order.maTkTao], ["Tạo lúc", dateTime(order.thoiGianTao)], ["Tài xế hiện tại", shownDriver ?? "Chưa phân công"], ["Quãng đường", `${order.quangDuongKm} km`], ["Ghi chú giao hàng", order.ghiChuGiaoHang ?? "Không có"]].map(([label, value]) => <div key={label}><dt className="text-sm text-stone-500">{label}</dt><dd className="font-semibold mt-1 break-words">{value}</dd></div>)}
        </dl>
      </section>
      <div className="grid md:grid-cols-2 gap-5">
        <section className="dispatch-panel space-y-3"><h2 className="text-xl font-bold">Cước đã chốt</h2>
          <dl className="space-y-2">{[["Cước gốc", order.cuoc.cuocGoc], ["Phụ thu", order.cuoc.tienPhuThu], ["Giảm giá", order.cuoc.tienGiamGia], ["Tổng cước", order.cuoc.tongCuoc], ["Còn phải thu", order.thanhToan.soTienConPhaiThu]].map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-bold">{money(value)}</dd></div>)}</dl>
          {order.cuoc.phuThu.map((item) => <p key={item.maPhuThu} className="text-sm text-stone-600">{item.tenPhuThu}: {money(item.soTienTinh)}</p>)}
          {order.thanhToan.canDoiSoat && <p>Cần đối soát thanh toán.</p>}
        </section>
        <section className="dispatch-panel space-y-3"><h2 className="text-xl font-bold">Kiện hàng</h2>{order.kienHang.map((parcel, index) => <p key={index}>#{index + 1} · {parcel.loaiHangHoa} · {parcel.khoiLuongKg} kg {parcel.ghiChuBaoQuan && `· ${parcel.ghiChuBaoQuan}`}</p>)}</section>
      </div>
      <section className="dispatch-panel space-y-4"><h2 className="text-xl font-bold">Lịch sử phân công</h2>
        {!order.phanCong.length && <p>Chưa có phân công.</p>}
        {order.phanCong.map((assignment) => <div key={assignment.maPhanCong} className="border-b border-stone-200 pb-3">
          <p className="font-semibold">{assignment.maTx} · {assignment.ketQuaKetThuc ?? "Đang phân công"}</p><p>{dateTime(assignment.batDauLuc)}{assignment.ketThucLuc ? ` → ${dateTime(assignment.ketThucLuc)}` : ""}</p><p>Tổng đài: {assignment.maTkDieuPhoi}</p>{assignment.lyDo && <p>Lý do: {assignment.lyDo}</p>}
        </div>)}
      </section>
      <section className="dispatch-panel space-y-4"><h2 className="text-xl font-bold">Nhật ký đơn</h2>
        {!order.nhatKy.length && <p>Chưa có nhật ký.</p>}
        {[...order.nhatKy].sort((a, b) => a.thuTu - b.thuTu).map((event) => <div key={event.maSuKien} className="border-b border-stone-200 pb-3"><p className="font-semibold">#{event.thuTu} · {event.loaiSuKien}</p><p>{dateTime(event.thoiGian)} · {event.nguoiThucHien}</p><p>{event.trangThaiTruoc ?? "Khởi tạo"} → {event.trangThaiSau}</p>{event.ghiChu && <p>{event.ghiChu}</p>}{event.loaiSuCo && <p>Sự cố: {event.loaiSuCo}</p>}</div>)}
      </section>
    </>}
  </DispatchShell>;
}
