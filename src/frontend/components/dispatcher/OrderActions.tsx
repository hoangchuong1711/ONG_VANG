"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, canCancel, dispatchApi, type Order } from "@/lib/api/dispatch";
import { useResource } from "@/lib/api/use-resource";
import { ErrorNotice, Pagination } from "./Views";
/** Modal traps focus, restores its opener and prevents duplicate writes. */
function Dialog({ title, busy, close, children }: { title: string; busy: boolean; close: () => void; children: React.ReactNode }) {
  const container = useRef<HTMLElement>(null);
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null;
    const root = container.current;
    root?.focus();
    return () => { prior?.focus(); };
  }, []);
  return <div className="dispatch-dialog" onClick={(event) => { if (event.target === event.currentTarget && !busy) close(); }}>
    <section ref={container} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} onKeyDown={(event) => {
      if (event.key === "Escape" && !busy) close();
      if (event.key === "Tab") {
        const elements = container.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]');
        if (!elements?.length) { event.preventDefault(); return; }
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === container.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === container.current)) { event.preventDefault(); first.focus(); }
      }
    }} className="space-y-5">
      <h2 className="text-xl font-bold">{title}</h2>{children}
      <button className="dispatch-button secondary" disabled={busy} onClick={close}>Đóng</button>
    </section>
  </div>;
}
function AssignDialog({ order, close, changed, reloading }: { order: Order; close: () => void; changed: (error?: unknown) => void; reloading: boolean }) {
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [orderConflict, setOrderConflict] = useState(false);
  const lock = useRef(false);
  const load = useCallback((signal: AbortSignal) => dispatchApi.suggestions(order.maDon, page, signal), [order.maDon, page]);
  const key = `${order.maDon}:${page}:${revision}`;
  const suggestions = useResource(key, load);
  const selectedAvailable = suggestions.data?.items.some((driver) => driver.maTx === selected);
  const unavailable = reloading || order.trangThai !== "CHO_GAN" || orderConflict || !!suggestions.error;
  function refresh() { setSelected(""); setRevision((value) => value + 1); }
  return <Dialog title={`Gán tài xế — ${order.maDon}`} busy={busy} close={close}>
    <p>Danh sách được gợi ý theo quy tắc của hệ thống. Chọn một tài xế để xác nhận.</p>
    {error ? <ErrorNotice error={error} /> : null}
    {suggestions.loading ? <p role="status">Đang tìm tài xế phù hợp…</p> : suggestions.error ? <ErrorNotice error={suggestions.error} retry={refresh} /> :
      !suggestions.data?.items.length ? <p role="status">Không có tài xế phù hợp. Hãy thử làm mới khi tài xế sẵn sàng.</p> :
      <fieldset disabled={busy || unavailable} className="space-y-2"><legend className="font-semibold mb-2">Tài xế gợi ý</legend>
        {suggestions.data.items.map((driver, index) => <label key={driver.maTx} className="flex gap-3 items-start border border-stone-200 rounded-xl p-3 cursor-pointer">
          <input type="radio" name="driver" value={driver.maTx} checked={selected === driver.maTx} onChange={() => setSelected(driver.maTx)} className="mt-1" />
          <span><strong>{driver.hoTen}</strong> <span className="text-xs text-stone-500">#{page * 10 + index + 1}</span><br />
            {driver.maTx} · {driver.soDienThoai}<br />{driver.phuongTien?.bienSoXe ?? "Chưa có phương tiện"} · {driver.phuongTien?.loaiXe}</span>
        </label>)}
      </fieldset>}
    <Pagination page={page} totalPages={suggestions.data?.totalPages ?? 0} busy={busy || suggestions.loading} change={(next) => { setSelected(""); setPage(next); }} />
    <div className="flex flex-wrap gap-3">
      <button className="dispatch-button secondary" disabled={busy} onClick={refresh}>Làm mới tài xế</button>
      <button className="dispatch-button" disabled={busy || suggestions.loading || !selectedAvailable || unavailable} onClick={async () => {
        if (lock.current || suggestions.loading || unavailable || !selectedAvailable) return; lock.current = true; setBusy(true); setError(undefined);
        try { await dispatchApi.assign(order.maDon, selected); changed(); close(); }
        catch (failure) {
          setError(failure); setSelected("");
          if (failure instanceof ApiError && failure.code === "ORDER_STATE_CONFLICT") setOrderConflict(true);
          refresh(); changed(failure);
        } finally { lock.current = false; setBusy(false); }
      }}>{busy ? "Đang gán…" : "Xác nhận gán"}</button>
    </div>
  </Dialog>;
}
function CancelDialog({ order, close, changed, reloading }: { order: Order; close: () => void; changed: (error?: unknown) => void; reloading: boolean }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [blocked, setBlocked] = useState(false);
  const lock = useRef(false);
  const now = useNow();
  return <Dialog title={`Hủy đơn — ${order.maDon}`} busy={busy} close={close}>
    <p>Chỉ hủy đơn chờ gán hoặc đã gán trước 5 phút từ lúc tạo. Tài xế sẽ được giải phóng khi hệ thống xác nhận hủy.</p>
    {error ? <ErrorNotice error={error} /> : null}
    {!canCancel(order, now) && <p role="alert">Đơn không còn trong thời hạn hủy.</p>}
    <form className="space-y-4" onSubmit={async (event) => {
      event.preventDefault(); if (lock.current || reloading || blocked || !canCancel(order) || !reason.trim()) return;
      lock.current = true; setBusy(true); setError(undefined);
      try { await dispatchApi.cancel(order.maDon, reason); changed(); close(); }
      catch (failure) {
        setError(failure);
        if (failure instanceof ApiError && failure.status === 409) setBlocked(true);
        changed(failure);
      } finally { lock.current = false; setBusy(false); }
    }}>
      <label className="block space-y-2"><span>Lý do hủy (bắt buộc)</span><textarea className="dispatch-input" required maxLength={500} rows={3} value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} /></label>
      <button className="dispatch-button danger" disabled={busy || reloading || blocked || !canCancel(order, now) || !reason.trim()}>{busy ? "Đang hủy…" : "Xác nhận hủy"}</button>
    </form>
  </Dialog>;
}
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  return now;
}
export function OrderActions({ order, changed, loading = false }: { order: Order; changed: (error?: unknown) => void; loading?: boolean }) {
  const [action, setAction] = useState<"assign" | "cancel" | null>(null);
  const now = useNow();
  return <div className="flex flex-wrap gap-2">
    {order.trangThai === "CHO_GAN" && <button className="dispatch-button" disabled={loading} onClick={() => setAction("assign")}>Gán tài xế</button>}
    {["CHO_GAN", "DA_GAN"].includes(order.trangThai) && <button className="dispatch-button danger" disabled={loading || !canCancel(order, now)} title="Chỉ hủy trước 5 phút từ khi tạo" onClick={() => setAction("cancel")}>Hủy đơn</button>}
    {action === "assign" && <AssignDialog order={order} close={() => setAction(null)} changed={changed} reloading={loading} />}
    {action === "cancel" && <CancelDialog order={order} close={() => setAction(null)} changed={changed} reloading={loading} />}
  </div>;
}
