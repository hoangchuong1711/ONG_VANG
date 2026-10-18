"""Read-only smoke for admin driver, vehicle and customer directories."""

import argparse
import http.cookiejar
import json
import os
import urllib.error
import urllib.request


def client(base):
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def call(path, method="GET", body=None, csrf=None):
        headers = {"Content-Type": "application/json"} if body is not None else {}
        if csrf:
            headers["X-CSRF-Token"] = csrf
        request = urllib.request.Request(base + path, data=json.dumps(body).encode() if body is not None else None,
                                         method=method, headers=headers)
        try:
            response = opener.open(request, timeout=8)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            content_type = response.headers.get("Content-Type", "")
            payload = response.read()
            return response.status, json.loads(payload) if "application/json" in content_type else payload

    return call


def expect(call, path, status=200):
    actual, payload = call(path)
    if actual != status:
        raise AssertionError(f"{path}: HTTP {actual}, expected {status}: {payload}")
    return payload


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:8081")
    parser.add_argument("--expected-database", default="mini_ong_vang_design_v2_demo")
    parser.add_argument("--owner", default="demo_admin")
    args = parser.parse_args()
    password = os.environ.get("V2_SMOKE_PASSWORD")
    if not password:
        raise SystemExit("Set V2_SMOKE_PASSWORD in this process environment")

    base = args.base.rstrip("/")
    owner = client(base)
    health = expect(owner, "/api/health")
    assert health["databaseName"] == args.expected_database, health
    csrf = expect(owner, "/api/v2/auth/csrf")["token"]
    status, session = owner("/api/v2/auth/login", "POST", {"username": args.owner, "password": password}, csrf)
    assert status == 200 and session["vaiTro"] == "CHU_DOI_XE", session

    drivers = expect(owner, "/api/v2/admin/drivers")["items"]
    customers = expect(owner, "/api/v2/admin/customers")["items"]
    vehicles = expect(owner, "/api/v2/vehicles")["items"]
    policies = expect(owner, "/api/v2/policies")["items"]
    staff = expect(owner, "/api/v2/admin/staff")["items"]
    assert all("cccd" in row and "ngay_het_han_gplx" in row and "trang_thai_tai_khoan" in row for row in drivers)
    assert all("ma_hang" in row and "thanh_vien_tu" in row and "thanh_vien_den" in row for row in customers)
    assert all("don_gia_km" in row and "don_gia_kg" in row for row in policies if row["loai"] == "CUOC")
    assert any(row["vai_tro"] == "CHU_DOI_XE" and row["trang_thai"] == "HOAT_DONG" for row in staff)
    if customers:
        detail = expect(owner, f"/api/v2/admin/customers/{customers[0]['ma_kh']}?page=0&size=20")
        assert detail["ma_kh"] == customers[0]["ma_kh"] and "don_hang" in detail
    print(f"OK: directories and stage-5 policy/staff read from {health['databaseName']}; drivers={len(drivers)}, vehicles={len(vehicles)}, customers={len(customers)}, policies={len(policies)}, staff={len(staff)}")


if __name__ == "__main__":
    main()
