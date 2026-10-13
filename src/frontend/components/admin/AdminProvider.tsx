"use client";

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from "react";
import {
  ADMIN_STORAGE_KEY,
  availableDrivers,
  canCancelOrder,
  initialAdminState,
  readAdminState,
  type AdminDemoState,
} from "@/lib/admin-demo";

type ActionResult = { ok: true; message: string } | { ok: false; message: string };

type AdminContextValue = AdminDemoState & {
  ready: boolean;
  updateDemo: (updater: (previous: AdminDemoState) => AdminDemoState) => void;
  assignDriver: (orderId: string, driverId: string) => ActionResult;
  cancelOrder: (orderId: string, reason: string) => ActionResult;
  resetDemo: () => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);
const subscribeToMount = () => () => {};

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AdminDemoState>(readAdminState);
  const ready = useSyncExternalStore(subscribeToMount, () => true, () => false);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(state)); }
    catch { /* Keep demo usable even when browser storage is unavailable. */ }
  }, [ready, state]);

  const assignDriver = useCallback((orderId: string, driverId: string): ActionResult => {
    const order = state.orders.find((item) => item.id === orderId);
    const driver = state.drivers.find((item) => item.id === driverId);
    if (!order || !driver) return { ok: false, message: "Không tìm thấy đơn hoặc tài xế." };
    if (!["CHO_GAN", "DA_GAN"].includes(order.status)) {
      return { ok: false, message: "Trạng thái đơn hiện tại không cho phép phân công." };
    }
    if (order.driver?.id === driverId) return { ok: false, message: "Tài xế này đang phụ trách đơn." };
    if (!availableDrivers(state.orders, orderId, state.drivers).some((item) => item.id === driverId)) {
      return { ok: false, message: "Tài xế không còn sẵn sàng. Hãy chọn người khác." };
    }
    const isChange = Boolean(order.driver);
    setState((previous) => ({
      ...previous,
      orders: previous.orders.map((item) => item.id === orderId ? {
        ...item,
        status: "DA_GAN",
        statusText: "Đã gán tài xế",
        driver: {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          vehiclePlate: driver.vehiclePlate,
          vehicleType: driver.vehicleType,
        },
      } : item),
      events: [{
        id: crypto.randomUUID(), orderId,
        title: isChange ? "Đổi tài xế" : "Phân công tài xế",
        detail: `${isChange ? `Từ ${order.driver?.name} sang` : "Đã giao cho"} ${driver.name} (${driver.vehiclePlate}).`,
        at: new Date().toISOString(),
      }, ...previous.events],
    }));
    return { ok: true, message: isChange ? "Đã đổi tài xế cho đơn hàng." : "Đã phân công tài xế." };
  }, [state.orders, state.drivers]);

  const cancelOrder = useCallback((orderId: string, reason: string): ActionResult => {
    const order = state.orders.find((item) => item.id === orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn hàng." };
    if (!canCancelOrder(order)) return { ok: false, message: "Đơn này không thể hủy ở trạng thái hiện tại." };
    if (reason.trim().length < 8) return { ok: false, message: "Vui lòng nhập lý do ít nhất 8 ký tự." };
    setState((previous) => ({
      ...previous,
      orders: previous.orders.map((item) => item.id === orderId ? {
        ...item, status: "DA_HUY", statusText: "Đã hủy", driver: undefined,
      } : item),
      events: [{
        id: crypto.randomUUID(), orderId, title: "Hủy đơn hàng",
        detail: reason.trim(), at: new Date().toISOString(),
      }, ...previous.events],
    }));
    return { ok: true, message: "Đơn hàng đã được hủy trong dữ liệu demo." };
  }, [state.orders]);

  const resetDemo = useCallback(() => {
    window.localStorage.removeItem(ADMIN_STORAGE_KEY);
    window.location.reload();
  }, []);
  const updateDemo = useCallback((updater: (previous: AdminDemoState) => AdminDemoState) => setState(updater), []);

  const visibleState = ready ? state : initialAdminState();
  return <AdminContext.Provider value={{ ...visibleState, ready, updateDemo, assignDriver, cancelOrder, resetDemo }}>
    {children}
  </AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin phải được dùng trong AdminProvider");
  return context;
}
