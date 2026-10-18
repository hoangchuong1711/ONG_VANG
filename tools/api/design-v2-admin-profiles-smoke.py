"""Mutating admin profile smoke. Run only against an isolated designV2 test DB."""

import argparse
import http.cookiejar
import json
import os
import random
import urllib.error
import urllib.request


def client(base):
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def call(path, method="GET", body=None, csrf=None):
        headers = {}
        if body is not None:
            headers["Content-Type"] = "application/json"
        if csrf:
            headers["X-CSRF-Token"] = csrf
        request = urllib.request.Request(
            base + path, data=json.dumps(body).encode() if body is not None else None,
            method=method, headers=headers,
        )
        try:
            response = opener.open(request, timeout=8)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            payload = response.read()
            content_type = response.headers.get("Content-Type", "")
            return response.status, json.loads(payload) if "application/json" in content_type else payload

    return call


def expect(call, path, expected=200):
    status, payload = call(path)
    if status != expected:
        raise AssertionError(f"{path}: HTTP {status}, expected {expected}: {payload}")
    return payload


def auth(call, username, password):
    csrf = expect(call, "/api/v2/auth/csrf")["token"]
    status, payload = call("/api/v2/auth/login", "POST", {"username": username, "password": password}, csrf)
    return status, payload, csrf


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:8082")
    parser.add_argument("--expected-database", default="mini_ong_vang_design_v2_test_admin")
    args = parser.parse_args()
    password = os.environ.get("V2_SMOKE_PASSWORD")
    if not password:
        raise SystemExit("Set V2_SMOKE_PASSWORD in this process environment")

    health = expect(client(args.base.rstrip("/")), "/api/health")
    assert health["databaseName"] == args.expected_database, health
    admin = client(args.base.rstrip("/"))
    login_status, login_result, _ = auth(admin, "test_admin", password)
    assert login_status == 200, f"Test admin login failed: HTTP {login_status}, {login_result}"
    assert login_result["vaiTro"] == "CHU_DOI_XE"
    csrf = expect(admin, "/api/v2/auth/csrf")["token"]

    invalid = {"username": "bad driver", "matKhau": "short", "hoTen": "Bad", "soDienThoai": "123",
               "cccd": "123", "soGiayPhep": "", "ngayHetHanGPLX": "bad-date"}
    assert admin("/api/v2/admin/drivers", "POST", invalid, csrf)[0] == 400

    phone = f"08{random.randrange(100_000_000):08d}"
    cccd = f"0{random.randrange(10**11):011d}"
    username = f"driver_{phone[-6:]}"
    payload = {"username": username, "matKhau": "Driver_Test_2026!", "hoTen": "Tài xế kiểm thử",
               "soDienThoai": phone, "email": f"{username}@example.test", "cccd": cccd,
               "soGiayPhep": f"GPLX-{phone[-6:]}", "ngayHetHanGPLX": "2032-12-31"}
    status, created = admin("/api/v2/admin/drivers", "POST", payload, csrf)
    assert status == 201, created
    driver_id = created["ma_tx"]
    driver_rows = expect(admin, "/api/v2/admin/drivers")["items"]
    driver = next(row for row in driver_rows if row["ma_tx"] == driver_id)
    assert driver["username"] == username and driver["cccd"] == cccd
    duplicate_phone = f"08{random.randrange(100_000_000):08d}"
    duplicate = {**payload, "username": f"driver_{duplicate_phone[-6:]}", "soDienThoai": duplicate_phone}
    assert admin("/api/v2/admin/drivers", "POST", duplicate, csrf)[0] == 409
    assert all(row["username"] != duplicate["username"] for row in expect(admin, "/api/v2/admin/drivers")["items"])
    print("Driver creation/list OK", flush=True)

    update = {key: value for key, value in payload.items() if key not in ("username", "matKhau")}
    update["hoTen"] = "Tài xế đã cập nhật"
    status, edited = admin(f"/api/v2/admin/drivers/{driver_id}", "PATCH", update, csrf)
    assert status == 200 and edited["ho_ten"] == update["hoTen"], edited
    print("Driver profile update OK", flush=True)

    vehicle = {"hanhDong": "LUU", "maTx": driver_id, "bienSo": f"T-{phone[-6:]}",
               "loaiXe": "Xe máy", "mauXe": "Đen", "hoatDong": True}
    status, _ = admin("/api/v2/vehicles", "POST", vehicle, csrf)
    assert status == 200, "Vehicle create failed"
    assert any(row["ma_tx"] == driver_id for row in expect(admin, "/api/v2/vehicles")["items"])
    print("Vehicle upsert/list OK", flush=True)

    driver_session = client(args.base.rstrip("/"))
    status, driver_login, _ = auth(driver_session, username, payload["matKhau"])
    assert status == 200 and driver_login["vaiTro"] == "TAI_XE", driver_login
    status, locked = admin(f"/api/v2/admin/drivers/{driver_id}/status", "POST", {"hanhDong": "KHOA"}, csrf)
    assert status == 200 and locked["trang_thai_tai_khoan"] == "KHOA" and locked["trang_thai"] == "NGHI", locked
    assert driver_session("/api/v2/auth/me")[0] == 401, "Lock did not revoke the driver's existing session"
    assert auth(client(args.base.rstrip("/")), username, payload["matKhau"])[0] == 403
    print("Driver lock/session revocation OK", flush=True)
    status, unlocked = admin(f"/api/v2/admin/drivers/{driver_id}/status", "POST", {"hanhDong": "MO_KHOA"}, csrf)
    assert status == 200 and unlocked["trang_thai_tai_khoan"] == "HOAT_DONG" and unlocked["trang_thai"] == "OFFLINE", unlocked

    customer_phone = f"09{random.randrange(100_000_000):08d}"
    customer_password = "Customer_Test_2026!"
    reg = client(args.base.rstrip("/"))
    reg_csrf = expect(reg, "/api/v2/auth/csrf")["token"]
    status, _ = reg("/api/v2/auth/register", "POST", {"username": customer_phone, "password": customer_password,
            "hoTen": "Khách kiểm thử", "soDienThoai": customer_phone, "email": "customer-test@example.test"}, reg_csrf)
    assert status == 201, "Customer registration failed"
    print("Customer registration OK", flush=True)
    customer_session = client(args.base.rstrip("/"))
    assert auth(customer_session, customer_phone, customer_password)[0] == 200
    customer_rows = expect(admin, "/api/v2/admin/customers")["items"]
    customer = next(row for row in customer_rows if row["so_dien_thoai"] == customer_phone)
    detail = expect(admin, f"/api/v2/admin/customers/{customer['ma_kh']}?page=0&size=20")
    assert detail["tong_don"] == 0 and detail["don_hang"] == [] and detail["ma_hang"] == "THUONG"
    status, locked_customer = admin(f"/api/v2/admin/customers/{customer['ma_kh']}/status", "POST", {"hanhDong": "KHOA"}, csrf)
    assert status == 200 and locked_customer["trang_thai_tai_khoan"] == "KHOA", locked_customer
    assert customer_session("/api/v2/auth/me")[0] == 401, "Lock did not revoke the customer's existing session"
    print("Customer lock/session revocation OK", flush=True)
    assert auth(client(args.base.rstrip("/")), customer_phone, customer_password)[0] == 403
    status, unlocked_customer = admin(f"/api/v2/admin/customers/{customer['ma_kh']}/status", "POST", {"hanhDong": "MO_KHOA"}, csrf)
    assert status == 200 and unlocked_customer["trang_thai_tai_khoan"] == "HOAT_DONG", unlocked_customer

    print("OK: V12 migrations, driver create/edit/vehicle, account lock session revocation, customer details and lock/unlock")


if __name__ == "__main__":
    main()
