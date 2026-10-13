"use client";

import Link from "next/link";
import { useDemoStore } from "@/lib/demo-store";
import { formatVND } from "@/lib/utils";

export default function DispatcherPreview() {
  const { state, ready } = useDemoStore();
  const orders = state.orders;
  const pending = orders.filter((order) => order.status === "CHO_GAN");
  const busy = state.drivers.filter((driver) => driver.status === "ONLINE_BUSY");
  const idle = state.drivers.filter((driver) => driver.status === "ONLINE_IDLE");

  return <div className="min-h-screen bg-stone-50">
    <header className="border-b border-stone-200 bg-white">
      <div className="max-w-[1200px] mx-auto px-4 py-4 flex flex-wrap gap-4 items-center justify-between">
        <Link href="/" className="font-extrabold text-xl">Mini Ong Vàng <span className="text-amber-700 text-sm">Điều phối</span></Link>
        <nav aria-label="Điều hướng bản xem thử" className="flex flex-wrap gap-4 text-sm font-semibold">
          <span aria-current="page" className="text-amber-800 underline underline-offset-8">Bàn điều phối</span>
          <Link href="/login?role=dispatcher" className="text-stone-600 hover:text-amber-800">Đăng nhập tổng đài</Link>
        </nav>
      </div>
    </header>
    <main className="dispatch-page space-y-5">
      <div className="dispatch-panel border-amber-300 bg-amber-50 space-y-2">
        <h1 className="text-3xl font-extrabold">Bàn điều phối</h1>
        <p><strong>Bản xem thử:</strong> dữ liệu mẫu trong trình duyệt. Đăng nhập tổng đài để xem đơn và gán tài xế trên hệ thống thật.</p>
        <Link className="dispatch-button inline-block" href="/login?role=dispatcher">Đăng nhập tổng đài để điều phối thật</Link>
      </div>
      {!ready ? <p role="status">Đang nạp dữ liệu mẫu…</p> : <>
        <section className="grid gap-4 sm:grid-cols-3" aria-label="Tổng quan điều phối">
          <div className="dispatch-panel"><p className="text-stone-600">Đơn chờ phân công</p><strong className="text-3xl">{pending.length}</strong></div>
          <div className="dispatch-panel"><p className="text-stone-600">Tài xế rảnh</p><strong className="text-3xl">{idle.length}</strong></div>
          <div className="dispatch-panel"><p className="text-stone-600">Tài xế đang bận</p><strong className="text-3xl">{busy.length}</strong></div>
        </section>
        <section className="dispatch-panel">
          <h2 className="text-xl font-bold mb-4">Đơn đang chờ gán</h2>
          {pending.length === 0 ? <p>Chưa có đơn chờ gán trong dữ liệu mẫu.</p> : <div className="overflow-x-auto"><table className="dispatch-table">
            <thead><tr><th>Mã đơn</th><th>Điểm lấy</th><th>Điểm giao</th><th>Người nhận</th><th>Cước</th></tr></thead>
            <tbody>{pending.map((order) => <tr key={order.id}>
              <td className="font-bold">{order.id}</td><td>{order.sender.street}</td><td>{order.receiver.street}</td>
              <td>{order.receiver.name}</td><td>{formatVND(order.totalFee)}</td>
            </tr>)}</tbody>
          </table></div>}
        </section>
        <section className="dispatch-panel">
          <h2 className="text-xl font-bold mb-4">Tài xế mẫu</h2>
          {state.drivers.length === 0 ? <p>Chưa có tài xế trong dữ liệu mẫu.</p> : <div className="overflow-x-auto"><table className="dispatch-table">
            <thead><tr><th>Tài xế</th><th>Phương tiện</th><th>Trạng thái</th></tr></thead>
            <tbody>{state.drivers.map((driver) => <tr key={driver.id}>
              <td>{driver.name}</td><td>{driver.vehiclePlate}</td>
              <td>{driver.status === "ONLINE_IDLE" ? "Đang rảnh" : driver.status === "ONLINE_BUSY" ? "Đang bận" : "Ngoại tuyến"}</td>
            </tr>)}</tbody>
          </table></div>}
        </section>
      </>}
    </main>
  </div>;
}
