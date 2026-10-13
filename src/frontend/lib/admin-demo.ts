import { SAMPLE_DRIVERS, SAMPLE_ORDERS } from "@/lib/sample-data";
import type { DriverItem, OrderItem } from "@/lib/types";
import {
  INITIAL_CUSTOMERS, INITIAL_DISCOUNTS, INITIAL_DRIVERS, INITIAL_FARE,
  INITIAL_INCIDENTS, INITIAL_SETTINGS, INITIAL_STAFF, INITIAL_VEHICLES,
  type AdminCustomer, type AdminDriver, type AdminIncident, type AdminSettings,
  type AdminStaff, type AdminVehicle, type FareConfig, type MemberDiscount,
} from "@/lib/admin-extras";

export type AdminEvent = {
  id: string;
  orderId: string;
  title: string;
  detail: string;
  at: string;
};

export type AdminDemoState = {
  orders: OrderItem[];
  events: AdminEvent[];
  drivers: AdminDriver[];
  vehicles: AdminVehicle[];
  incidents: AdminIncident[];
  customers: AdminCustomer[];
  staff: AdminStaff[];
  fare: FareConfig;
  discounts: MemberDiscount[];
  settings: AdminSettings;
  activity: { id: string; title: string; detail: string; at: string }[];
};

export const ADMIN_STORAGE_KEY = "mini-ong-vang-admin-demo-v2";

export function initialAdminState(): AdminDemoState {
  return {
    orders: SAMPLE_ORDERS.map((order) => {
      const driver = INITIAL_DRIVERS.find((item) => item.id === order.driver?.id);
      return { ...order, driver: driver ? {
        id: driver.id, name: driver.name, phone: driver.phone,
        vehiclePlate: driver.vehiclePlate, vehicleType: driver.vehicleType,
      } : undefined };
    }),
    events: [],
    drivers: INITIAL_DRIVERS.map((driver) => ({ ...driver })),
    vehicles: INITIAL_VEHICLES.map((vehicle) => ({ ...vehicle })),
    incidents: INITIAL_INCIDENTS.map((incident) => ({ ...incident })),
    customers: INITIAL_CUSTOMERS.map((customer) => ({ ...customer })),
    staff: INITIAL_STAFF.map((member) => ({ ...member })),
    fare: { ...INITIAL_FARE },
    discounts: INITIAL_DISCOUNTS.map((discount) => ({ ...discount })),
    settings: { ...INITIAL_SETTINGS },
    activity: [],
  };
}

export function readAdminState(): AdminDemoState {
  if (typeof window === "undefined") return initialAdminState();
  try {
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return initialAdminState();
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" && parsed !== null &&
      "orders" in parsed && Array.isArray(parsed.orders) &&
      "events" in parsed && Array.isArray(parsed.events) &&
      "drivers" in parsed && Array.isArray(parsed.drivers) &&
      "vehicles" in parsed && Array.isArray(parsed.vehicles) &&
      "incidents" in parsed && Array.isArray(parsed.incidents) &&
      "customers" in parsed && Array.isArray(parsed.customers) &&
      "staff" in parsed && Array.isArray(parsed.staff) &&
      "fare" in parsed && typeof parsed.fare === "object" &&
      "discounts" in parsed && Array.isArray(parsed.discounts) &&
      "settings" in parsed && typeof parsed.settings === "object" &&
      "activity" in parsed && Array.isArray(parsed.activity)
    ) {
      const knownIds = new Set(SAMPLE_ORDERS.map((order) => order.id));
      const orders = (parsed.orders as OrderItem[]).filter((order) => knownIds.has(order.id));
      if (orders.length === SAMPLE_ORDERS.length) {
        return { ...(parsed as AdminDemoState), orders };
      }
    }
  } catch {
    // A corrupt demo snapshot should not prevent the admin UI from loading.
  }
  return initialAdminState();
}

export function availableDrivers(orders: OrderItem[], currentOrderId: string, drivers: DriverItem[] = SAMPLE_DRIVERS): DriverItem[] {
  const activeStatuses = new Set(["DA_GAN", "DA_LAY_HANG", "DANG_GIAO"]);
  const occupied = new Set(
    orders
      .filter((order) => order.id !== currentOrderId && activeStatuses.has(order.status))
      .map((order) => order.driver?.id)
      .filter(Boolean)
  );
  return drivers.filter((driver) =>
    driver.status === "ONLINE_IDLE" && driver.vehiclePlate !== "Chưa gán" &&
    !("locked" in driver && driver.locked) && !occupied.has(driver.id)
  );
}

export function canCancelOrder(order: OrderItem): boolean {
  return !["HOAN_TAT", "CHUA_THANH_TOAN", "DA_HUY"].includes(order.status);
}

export function statusLabel(order: OrderItem): string {
  if (order.status === "DA_HUY") return "Đã hủy";
  if (order.status === "CHUA_THANH_TOAN") return "Chờ thanh toán";
  if (order.status === "HOAN_TAT") return "Đã hoàn tất";
  if (order.status === "DANG_GIAO") return "Đang giao";
  if (order.status === "DA_LAY_HANG") return "Đã lấy hàng";
  if (order.status === "DA_GAN") return "Đã gán tài xế";
  return "Chờ gán";
}

export function statusTone(order: OrderItem): string {
  if (order.status === "DA_HUY") return "muted";
  if (order.status === "CHUA_THANH_TOAN") return "danger";
  if (order.status === "HOAN_TAT") return "success";
  if (order.status === "DANG_GIAO" || order.status === "DA_LAY_HANG") return "info";
  return "warning";
}
