"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import { dispatchApi, dateTime, money, statusLabels } from "@/lib/api/dispatch";
import { useResource } from "@/lib/api/use-resource";
import { DispatchShell, ErrorNotice, Pagination, Status } from "@/components/dispatcher/Views";
import { OrderActions } from "@/components/dispatcher/OrderActions";
export default function DispatcherBoard() {
  const [filters, setFilters] = useState({ trangThai: "CHO_GAN", tuNgay: "", denNgay: "" });
  const [draft, setDraft] = useState(filters);
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState<unknown>();
  const [invalid, setInvalid] = useState(false);
  const load = useCallback((signal: AbortSignal) => dispatchApi.orders({ ...filters, page, size: 10 }, signal), [filters, page]);
  const resource = useResource(`${JSON.stringify(filters)}:${page}:${revision}`, load);
  const refresh = () => setRevision((value) => value + 1);
  const changed = (error?: unknown) => { setActionError(error); setNotice("Đang cập nhật dữ liệu đơn từ hệ thống."); refresh(); };
  return <DispatchShell>
    <div className="flex flex-wrap gap-3 justify-between items-start">
      <div><h1 className="text-3xl font-extrabold">Bàn điều phối</h1><p className="text-stone-600 mt-2">Theo dõi đơn hàng và phân công tài xế sẵn sàng.</p></div>
      <div className="flex flex-wrap gap-2"><Link className="dispatch-button" href="/dispatcher/create-order">Tạo đơn tổng đài</Link><button className="dispatch-button secondary" onClick={refresh} disabled={resource.loading}>Làm mới đơn</button></div>
    </div>
    <form className="dispatch-panel grid gap-4 sm:grid-cols-4 items-end" onSubmit={(event) => {
      event.preventDefault(); const wrong = !!(draft.tuNgay && draft.denNgay && draft.denNgay <= draft.tuNgay);
      setInvalid(wrong); if (wrong) return; setNotice(""); setFilters({ ...draft }); setPage(0);
    }}>
      <label className="space-y-2"><span>Trạng thái đơn</span><select className="dispatch-input" value={draft.trangThai} onChange={(event) => setDraft({ ...draft, trangThai: event.target.value })}>
        <option value="">Tất cả trạng thái</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label className="space-y-2"><span>Từ ngày</span><input className="dispatch-input" type="date" value={draft.tuNgay} onChange={(event) => setDraft({ ...draft, tuNgay: event.target.value })} /></label>
      <label className="space-y-2"><span>Đến ngày (không gồm)</span><input className="dispatch-input" type="date" value={draft.denNgay} onChange={(event) => setDraft({ ...draft, denNgay: event.target.value })} /></label>
      <button className="dispatch-button">Áp dụng bộ lọc</button>
      {invalid && <p className="sm:col-span-4 text-rose-700" role="alert">Ngày kết thúc phải sau ngày bắt đầu.</p>}
    </form>
    {notice && !resource.loading && !resource.error && <p className="dispatch-notice" role="status">Dữ liệu đơn đã được cập nhật.</p>}
    {actionError ? <ErrorNotice error={actionError} /> : null}
    {resource.error ? <ErrorNotice error={resource.error} retry={refresh} /> : null}
    <section className="dispatch-panel" aria-busy={resource.loading}>
      {resource.loading && <p role="status" className="mb-4">Đang tải danh sách đơn…</p>}
      {resource.data && <p className="mb-4 text-stone-600">{resource.data.totalElements} đơn khớp bộ lọc · Tổng cước {money(resource.data.summary.tongCuoc)}</p>}
      {!resource.loading && !resource.error && !resource.data?.items.length && <p role="status">Không có đơn khớp bộ lọc.</p>}
      {resource.data && <div className="overflow-x-auto"><table className="dispatch-table"><caption className="sr-only">Danh sách đơn điều phối</caption>
        <thead><tr><th>Mã đơn / thời gian</th><th>Lộ trình</th><th>Trạng thái / tài xế</th><th>Cước</th><th>Thao tác</th></tr></thead>
        <tbody>{resource.data.items.map((order) => <tr key={order.maDon}>
          <td><Link className="font-bold text-amber-800 underline" href={`/dispatcher/orders/${encodeURIComponent(order.maDon)}`}>{order.maDon}</Link><p className="text-xs text-stone-500 mt-1">{dateTime(order.thoiGianTao)}</p></td>
          <td><p>{order.diemLayHang}</p><p className="mt-1 text-stone-500">→ {order.diemGiaoHang}</p><p className="text-xs mt-1">Người nhận: {order.sdtNguoiNhan}</p></td>
          <td><Status order={order} /><p className="mt-2">{order.maTx ? `Tài xế: ${order.maTx}` : "Chưa phân công"}</p></td>
          <td className="whitespace-nowrap">{money(order.cuoc.tongCuoc)}</td>
          <td><OrderActions order={order} changed={changed} loading={resource.loading || !!resource.error} /></td>
        </tr>)}</tbody>
      </table></div>}
      <Pagination page={page} totalPages={resource.data?.totalPages ?? 0} busy={resource.loading} change={(next) => { setPage(next); setNotice(""); }} />
    </section>
  </DispatchShell>;
}
