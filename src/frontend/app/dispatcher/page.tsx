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
    <section className="dispatch-hero flex flex-wrap items-center justify-between gap-5">
      <div className="relative z-10 max-w-2xl space-y-3"><span className="dispatch-eyebrow">Trung tâm vận hành · Dữ liệu trực tiếp</span>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Bàn điều phối</h1>
        <p className="text-stone-200">Theo dõi hàng đợi, xem chi tiết và phân công tài xế trên dữ liệu của hệ thống.</p>
      </div>
      <div className="relative z-10 flex flex-wrap gap-2"><Link className="dispatch-button" href="/dispatcher/create-order">+ Tạo đơn tổng đài</Link><button className="dispatch-button secondary" onClick={refresh} disabled={resource.loading}>Làm mới đơn</button></div>
    </section>
    <section className="grid gap-3 sm:grid-cols-3" aria-label="Tổng quan danh sách đơn">
      <div className="dispatch-metric amber"><span className="text-sm font-bold text-stone-600">Đơn khớp bộ lọc</span><strong>{resource.data?.totalElements ?? "—"}</strong><small>Đếm từ backend</small></div>
      <div className="dispatch-metric"><span className="text-sm font-bold text-stone-600">Tổng cước</span><strong className="!text-xl sm:!text-2xl">{resource.data ? money(resource.data.summary.tongCuoc) : "—"}</strong><small>Trong tập đơn khớp bộ lọc</small></div>
      <div className="dispatch-metric green"><span className="text-sm font-bold text-stone-600">Đơn trên trang</span><strong>{resource.data?.items.length ?? "—"}</strong><small>Trang hiện tại: {resource.data ? resource.data.page + 1 : 0} trên {resource.data?.totalPages ?? 0}</small></div>
    </section>
    <form className="dispatch-panel grid gap-4 sm:grid-cols-4 items-end" onSubmit={(event) => {
      event.preventDefault(); const wrong = !!(draft.tuNgay && draft.denNgay && draft.denNgay <= draft.tuNgay);
      setInvalid(wrong); if (wrong) return; setNotice(""); setFilters({ ...draft }); setPage(0);
    }}>
      <div className="sm:col-span-4 dispatch-section-head !mb-0"><div><h2>Bộ lọc đơn hàng</h2><p>Chọn trạng thái và khoảng thời gian để xem đúng hàng đợi.</p></div><span className="dispatch-pill">Dữ liệu thật</span></div>
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
      <div className="dispatch-section-head"><div><h2>{filters.trangThai === "CHO_GAN" ? "Hàng đợi chờ gán" : "Danh sách đơn hàng"}</h2><p>Cập nhật từ backend; chọn mã đơn để xem lịch sử phân công.</p></div><Link className="text-sm font-bold text-amber-800 hover:underline" href="/dispatcher/fleet">Xem đội tài xế →</Link></div>
      {resource.loading && <p role="status" className="mb-4">Đang tải danh sách đơn…</p>}
      {!resource.loading && !resource.error && !resource.data?.items.length && <p role="status" className="dispatch-empty">Không có đơn khớp bộ lọc.</p>}
      {resource.data && <div className="grid gap-3 lg:grid-cols-2" aria-label="Danh sách đơn điều phối">{resource.data.items.map((order) => <article className="dispatch-preview-card" key={order.maDon}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><Link className="font-extrabold text-amber-800 underline underline-offset-4" href={`/dispatcher/orders/${encodeURIComponent(order.maDon)}`}>{order.maDon}</Link><p className="text-xs text-stone-500 mt-1">{dateTime(order.thoiGianTao)}</p></div><Status order={order} /></div>
        <div className="space-y-2 mt-4"><p className="dispatch-route-line"><b>Lấy</b><span>{order.diemLayHang}</span></p><p className="dispatch-route-line delivery"><b>Giao</b><span>{order.diemGiaoHang}</span></p></div>
        <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-stone-500">Người nhận: {order.sdtNguoiNhan}</p><p className="text-xs text-stone-600 mt-1">{order.maTx ? `Tài xế: ${order.maTx}` : "Chưa phân công"}</p></div><strong className="text-base">{money(order.cuoc.tongCuoc)}</strong></div>
        <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap gap-2 items-center"><OrderActions order={order} changed={changed} loading={resource.loading || !!resource.error} /><Link className="dispatch-button secondary !text-sm" href={`/dispatcher/orders/${encodeURIComponent(order.maDon)}`}>Xem chi tiết</Link></div>
      </article>)}</div>}
      <Pagination page={page} totalPages={resource.data?.totalPages ?? 0} busy={resource.loading} change={(next) => { setPage(next); setNotice(""); }} />
    </section>
  </DispatchShell>;
}
