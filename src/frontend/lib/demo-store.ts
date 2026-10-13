"use client";

import { useSyncExternalStore } from "react";
import { ADMIN_STORAGE_KEY, initialAdminState, readAdminState, type AdminDemoState } from "./admin-demo";

const initialSnapshot = initialAdminState();
let snapshot = initialSnapshot;
let hydrated = false;
const listeners = new Set<() => void>();
const subscribeToMount = () => () => {};

function getSnapshot() {
  if (!hydrated && typeof window !== "undefined") {
    snapshot = readAdminState();
    hydrated = true;
  }
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== ADMIN_STORAGE_KEY) return;
    snapshot = readAdminState();
    hydrated = true;
    listeners.forEach((callback) => callback());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useDemoStore() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => initialSnapshot);
  const ready = useSyncExternalStore(subscribeToMount, () => true, () => false);
  return { state, ready };
}

export function updateDemoState(updater: (previous: AdminDemoState) => AdminDemoState) {
  const next = updater(getSnapshot());
  snapshot = next;
  try { window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(next)); }
  catch { /* The preview remains usable if storage is unavailable. */ }
  listeners.forEach((callback) => callback());
}

export function resetDemoState() {
  snapshot = initialAdminState();
  hydrated = true;
  try { window.localStorage.removeItem(ADMIN_STORAGE_KEY); } catch { /* Ignore unavailable storage. */ }
  listeners.forEach((callback) => callback());
}

export function toggleDemoDriverOnline(driverId: string) {
  updateDemoState((previous) => ({
    ...previous,
    drivers: previous.drivers.map((driver) => {
      if (driver.id !== driverId) return driver;
      if (driver.status !== "OFFLINE") return { ...driver, status: "OFFLINE" };
      const busy = previous.orders.some((order) => order.driver?.id === driverId &&
        ["DA_GAN", "DA_LAY_HANG", "DANG_GIAO"].includes(order.status));
      return { ...driver, status: busy ? "ONLINE_BUSY" : "ONLINE_IDLE" };
    }),
  }));
}
