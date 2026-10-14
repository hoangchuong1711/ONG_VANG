"use client";

import { memo, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { api, type DriverRoute } from "@/lib/live-orders";

type Point = [number, number];
type MapInstance = {
  on: (name: string, listener: () => void) => void;
  addSource: (name: string, source: object) => void;
  addLayer: (layer: object) => void;
  fitBounds: (bounds: [Point, Point], options: object) => void;
  remove: () => void;
};
type GoongSdk = {
  accessToken: string;
  Map: new (options: object) => MapInstance;
  Marker: new (options: object) => { setLngLat: (point: Point) => { addTo: (map: MapInstance) => void } };
};

const maptilesKey = process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY ?? "";

function decodePolyline(encoded: string): Point[] {
  const points: Point[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    const values: number[] = [];
    for (let axis = 0; axis < 2; axis++) {
      let shift = 0, value = 0, byte: number;
      do {
        if (index >= encoded.length) throw new Error("Dữ liệu tuyến đường không hợp lệ.");
        byte = encoded.charCodeAt(index++) - 63;
        value |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      values.push(value & 1 ? ~(value >> 1) : value >> 1);
    }
    lat += values[0]; lng += values[1];
    points.push([lng / 1e5, lat / 1e5]);
  }
  return points;
}

function DriverRouteMapView({ orderId }: { orderId: string }) {
  const [route, setRoute] = useState<DriverRoute | null>(null);
  const [routeError, setRouteError] = useState("");
  const [mapError, setMapError] = useState("");
  const [sdkReady, setSdkReady] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);

  useEffect(() => {
    let active = true;
    const initial = setTimeout(() => {
      api<DriverRoute>(`/orders/${encodeURIComponent(orderId)}/driver-route`)
        .then(data => { if (active) { setRoute(data); setRouteError(""); } })
        .catch(cause => { if (active) setRouteError((cause as Error).message); });
    }, 0);
    return () => { active = false; clearTimeout(initial); };
  }, [orderId]);

  useEffect(() => {
    if (!route || !sdkReady || !maptilesKey || !container.current) return;
    const goong = (window as Window & { goongjs?: GoongSdk }).goongjs;
    if (!goong) return;
    const mapContainer = container.current;
    if (mapRef.current) return;
    let map: MapInstance | null = null;
    let active = true;
    try {
      goong.accessToken = maptilesKey;
      map = new goong.Map({ container: container.current,
        style: "https://tiles.goong.io/assets/goong_map_web.json",
        center: [route.diemLay.lng, route.diemLay.lat], zoom: 11 });
      const currentMap = map;
      mapRef.current = currentMap;
      let drawn = false;
      currentMap.on("load", () => {
        if (!active || drawn) return;
        drawn = true;
        try {
          const legs = [
            { id: "pickup", data: route.denDiemLay.polyline, color: "#d97706" },
            { id: "dropoff", data: route.denDiemGiao.polyline, color: "#059669" },
          ];
          for (const leg of legs) {
            currentMap.addSource(leg.id, { type: "geojson", data: {
              type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: decodePolyline(leg.data) },
            } });
            currentMap.addLayer({ id: leg.id, type: "line", source: leg.id,
              layout: { "line-join": "round", "line-cap": "round" },
              paint: { "line-color": leg.color, "line-width": 5 } });
          }
          const locations = [route.taiXe, route.diemLay, route.diemGiao];
          locations.forEach((point, index) => {
            const marker = document.createElement("span");
            marker.textContent = String(index + 1);
            marker.className = "flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-stone-900 text-xs font-bold text-white shadow-lg";
            new goong.Marker({ element: marker }).setLngLat([point.lng, point.lat]).addTo(currentMap);
          });
          const lngs = locations.map(point => point.lng), lats = locations.map(point => point.lat);
          currentMap.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
            { padding: 42, maxZoom: 15 });
        } catch (cause) { if (active) setMapError((cause as Error).message); }
      });
      currentMap.on("error", () => { if (active) setMapError("Không tải được nền bản đồ Goong. Kiểm tra Maptiles Key, domain và kết nối mạng."); });
    } catch (cause) {
      const message = (cause as Error).message;
      setTimeout(() => { if (active) setMapError(message); }, 0);
    }
    return () => {
      active = false;
      map?.remove();
      mapRef.current = null;
      // The SDK owns everything inside this node; remove remnants before a remount.
      mapContainer.replaceChildren();
    };
  }, [route, sdkReady]);

  return (
    <section aria-label="Bản đồ hai chặng" className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold text-stone-900">Bản đồ tuyến giao hàng</h2>
        <span className="text-[11px] font-semibold text-stone-500">1 Tài xế → 2 Điểm lấy → 3 Điểm giao</span>
      </div>
      <p className="text-xs text-amber-900 rounded-lg bg-amber-50 p-2">Marker tài xế là vị trí cố định mô phỏng, không phải GPS trực tiếp.</p>
      {routeError && <p role="alert" className="text-xs text-rose-700">{routeError}</p>}
      {route && <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-stone-700">
        <span>🟠 Đi lấy: {route.denDiemLay.quangDuongKm} km · {Math.ceil(route.denDiemLay.thoiGianDuKienGiay / 60)} phút</span>
        <span>🟢 Giao hàng: {route.denDiemGiao.quangDuongKm} km · {Math.ceil(route.denDiemGiao.thoiGianDuKienGiay / 60)} phút</span>
      </div>}
      <p className="text-[11px] text-stone-500">Chặng đi lấy chỉ dùng để chỉ đường, không cộng vào km tính cước khách.</p>
      {!maptilesKey && <p role="alert" className="text-xs text-amber-900">Chưa cấu hình GOONG_API_MAPTILES_KEY cho frontend nên chưa tải được nền bản đồ.</p>}
      {mapError && <p role="alert" className="text-xs text-rose-700">{mapError}</p>}
      {route && maptilesKey && <>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css" />
        <Script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"
          strategy="afterInteractive" onReady={() => setSdkReady(true)}
          onError={() => setMapError("Không tải được Goong JS. Kiểm tra kết nối mạng.")} />
        <div ref={container} className="h-[320px] w-full overflow-hidden rounded-xl bg-stone-100 sm:h-[400px]" />
      </>}
    </section>
  );
}

export const DriverRouteMap = memo(DriverRouteMapView);
