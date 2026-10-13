"use client";
import { useCallback, useState } from "react";
import { dispatchApi } from "@/lib/api/dispatch";
import { useResource } from "@/lib/api/use-resource";
import { DispatchShell, ErrorNotice, Pagination } from "@/components/dispatcher/Views";
export default function DispatcherFleet() {
  const [status, setStatus] = useState("ONLINE");
  const [busy, setBusy] = useState("false");
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const load = useCallback((signal: AbortSignal) => dispatchApi.drivers({ trangThaiHoatDong: status, dangBanChuyen: busy, page, size: 10 }, signal), [status, busy, page]);
  const resource = useResource(`${status}:${busy}:${page}:${revision}`, load);
  const refresh = () => setRevision((value) => value + 1);
  return <DispatchShell>
    <div className="flex gap-3 justify-between items-center"><h1 className="text-3xl font-extrabold">Tài xế</h1><button className="dispatch-button secondary" disabled={resource.loading} onClick={refresh}>Làm mới tài xế</button></div>
    <p className="text-stone-600">Kiểm tra trạng thái và phương tiện trước khi phân công từ bàn điều phối.</p>
    <div className="dispatch-panel grid sm:grid-cols-2 gap-4">
      <label className="space-y-2"><span>Hoạt động</span><select aria-label="Hoạt động" className="dispatch-input" value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }}>
        <option value="">Tất cả</option><option value="ONLINE">Trực tuyến</option><option value="OFFLINE">Ngoại tuyến</option><option value="NGHI">Nghỉ</option>
      </select></label>
      <label className="space-y-2"><span>Chuyến hiện tại</span><select aria-label="Chuyến hiện tại" className="dispatch-input" value={busy} onChange={(event) => { setBusy(event.target.value); setPage(0); }}>
        <option value="">Tất cả</option><option value="false">Rảnh</option><option value="true">Bận</option>
      </select></label>
    </div>
    {resource.error ? <ErrorNotice error={resource.error} retry={refresh} /> : null}
    <section className="dispatch-panel" aria-busy={resource.loading}>
      {resource.loading && <p role="status">Đang tải tài xế…</p>}
      {!resource.loading && !resource.error && !resource.data?.items.length && <p role="status">Không có tài xế khớp bộ lọc.</p>}
      {resource.data && <><p className="mb-4">{resource.data.totalElements} tài xế khớp bộ lọc</p><div className="overflow-x-auto"><table className="dispatch-table"><caption className="sr-only">Danh sách tài xế</caption>
        <thead><tr><th>Tài xế</th><th>Số điện thoại</th><th>Phương tiện</th><th>Hoạt động</th><th>Chuyến</th></tr></thead>
        <tbody>{resource.data.items.map((driver) => <tr key={driver.maTx}><td><strong>{driver.hoTen}</strong><p className="text-xs text-stone-500">{driver.maTx}</p></td><td>{driver.soDienThoai}</td><td>{driver.phuongTien ? <>{driver.phuongTien.bienSoXe}<p>{driver.phuongTien.loaiXe} · {driver.phuongTien.mauXe}</p></> : "Chưa có phương tiện"}</td><td>{({ ONLINE: "Trực tuyến", OFFLINE: "Ngoại tuyến", NGHI: "Nghỉ" })[driver.trangThaiHoatDong]}</td><td>{driver.dangBanChuyen ? "Bận" : "Rảnh"}</td></tr>)}</tbody>
      </table></div></>}
      <Pagination page={page} totalPages={resource.data?.totalPages ?? 0} busy={resource.loading} change={setPage} />
    </section>
  </DispatchShell>;
}
