import { SAMPLE_DRIVERS, SAMPLE_INCIDENTS } from "@/lib/sample-data";
import type { DriverItem, IncidentItem } from "@/lib/types";

export type AdminDriver = DriverItem & { locked: boolean };
export type AdminVehicle = {
  id: string; plate: string; type: string; capacityKg: number;
  driverId: string | null; status: "HOAT_DONG" | "BAO_TRI" | "NGUNG";
};
export type AdminIncident = IncidentItem & { assignee: string; resolution: string };
export type AdminCustomer = {
  id: string; name: string; phone: string; tier: "THUONG" | "BAC" | "VANG";
  joinedAt: string; locked: boolean;
};
export type AdminStaff = {
  id: string; name: string; phone: string; role: "TONG_DAI" | "DIEU_PHOI" | "CHU_DOI_XE";
  active: boolean; joinedAt: string;
};
export type FareConfig = { baseFee: number; includedKm: number; perKm: number; maxKm: number; surcharge: number };
export type MemberDiscount = { tier: AdminCustomer["tier"]; percent: number; maxDiscount: number };
export type AdminSettings = { fleetName: string; hotline: string; email: string; address: string; serviceArea: string; notifyIncident: boolean; notifyPayment: boolean };

export const INITIAL_DRIVERS: AdminDriver[] = SAMPLE_DRIVERS.map((driver) => ({ ...driver, locked: false }));
export const INITIAL_VEHICLES: AdminVehicle[] = SAMPLE_DRIVERS.map((driver, index) => ({
  id: `XE-${String(index + 1).padStart(3, "0")}`,
  plate: driver.vehiclePlate, type: driver.vehicleType, capacityKg: index === 2 ? 15 : 10,
  driverId: driver.id, status: index === 4 ? "NGUNG" : "HOAT_DONG",
}));
export const INITIAL_INCIDENTS: AdminIncident[] = SAMPLE_INCIDENTS.map((incident) => ({ ...incident, assignee: "Trần Ngọc Huy", resolution: "" }));
export const INITIAL_CUSTOMERS: AdminCustomer[] = [
  { id: "KH-001", name: "Nguyễn Thu Hà", phone: "0900000001", tier: "VANG", joinedAt: "01/10/2026", locked: false },
  { id: "KH-002", name: "Phan Thanh Tùng", phone: "0934567890", tier: "THUONG", joinedAt: "06/10/2026", locked: false },
  { id: "KH-003", name: "Trần Anh Khoa", phone: "0908765432", tier: "BAC", joinedAt: "08/10/2026", locked: false },
  { id: "KH-004", name: "Phạm Thùy Linh", phone: "0933112233", tier: "THUONG", joinedAt: "11/10/2026", locked: false },
];
export const INITIAL_STAFF: AdminStaff[] = [
  { id: "NV-001", name: "Trần Ngọc Huy", phone: "0700000001", role: "DIEU_PHOI", active: true, joinedAt: "01/10/2026" },
  { id: "NV-002", name: "Lê Mai Anh", phone: "0700000002", role: "TONG_DAI", active: true, joinedAt: "03/10/2026" },
  { id: "NV-003", name: "Phạm Văn Minh", phone: "0600000001", role: "CHU_DOI_XE", active: true, joinedAt: "01/10/2026" },
];
export const INITIAL_FARE: FareConfig = { baseFee: 25000, includedKm: 2, perKm: 7000, maxKm: 30, surcharge: 10000 };
export const INITIAL_DISCOUNTS: MemberDiscount[] = [
  { tier: "THUONG", percent: 0, maxDiscount: 0 },
  { tier: "BAC", percent: 5, maxDiscount: 15000 },
  { tier: "VANG", percent: 10, maxDiscount: 30000 },
];
export const INITIAL_SETTINGS: AdminSettings = {
  fleetName: "Mini Ong Vàng", hotline: "19006868", email: "hotro@ongvang.vn",
  address: "123 Nguyễn Văn Linh, Quận 7, TP.HCM", serviceArea: "TP.HCM, tối đa 30 km",
  notifyIncident: true, notifyPayment: true,
};
