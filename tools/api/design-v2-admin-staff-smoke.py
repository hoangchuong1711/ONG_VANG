"""Admin staff smoke. Run only against mini_ong_vang_design_v2_test_admin."""

import argparse
import datetime as dt
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
        request = urllib.request.Request(base + path, data=json.dumps(body).encode() if body is not None else None,
                                         method=method, headers=headers)
        try:
            response = opener.open(request, timeout=15)
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


def login(call, username, password):
    csrf = expect(call, "/api/v2/auth/csrf")["token"]
    status, result = call("/api/v2/auth/login", "POST", {"username": username, "password": password}, csrf)
    if status != 200:
        raise AssertionError(f"Login failed: HTTP {status}: {result}")
    return result, expect(call, "/api/v2/auth/csrf")["token"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:8082")
    parser.add_argument("--expected-database", default="mini_ong_vang_design_v2_test_admin")
    args = parser.parse_args()
    owner_password = os.environ.get("V2_SMOKE_PASSWORD")
    if not owner_password:
        raise SystemExit("Set V2_SMOKE_PASSWORD in the process environment")

    base = args.base.rstrip("/")
    admin = client(base)
    health = expect(admin, "/api/health")
    assert health["databaseName"] == args.expected_database, health
    owner, owner_csrf = login(admin, "test_admin", owner_password)
    assert owner["vaiTro"] == "CHU_DOI_XE"

    suffix = f"{random.randrange(10**8):08d}"
    username = f"stage5_{suffix}"
    initial_password, reset_password = "Stage5_Test_2026!", "Stage5_Reset_2026!"
    payload = {"username": username, "matKhau": initial_password, "hoTen": "Nhân viên kiểm thử",
               "soDienThoai": f"08{suffix}", "email": f"{username}@example.test"}
    status, created_staff = admin("/api/v2/admin/staff", "POST", payload, owner_csrf)
    assert status == 201 and created_staff["vai_tro"] == "TONG_DAI", f"Staff create failed: {status}, {created_staff}"
    staff_id = created_staff["ma_tk"]
    listing = expect(admin, "/api/v2/admin/staff")["items"]
    assert any(x["ma_tk"] == staff_id and x["vai_tro"] == "TONG_DAI" for x in listing)
    edit = {"hoTen": "Nhân viên tổng đài cập nhật", "soDienThoai": payload["soDienThoai"], "email": payload["email"]}
    status, updated = admin(f"/api/v2/admin/staff/{staff_id}", "PATCH", edit, owner_csrf)
    assert status == 200 and updated["ho_ten"] == edit["hoTen"], updated

    employee = client(base)
    login(employee, username, initial_password)
    status, reset = admin(f"/api/v2/admin/staff/{staff_id}/password", "POST", {"matKhau": reset_password}, owner_csrf)
    assert status == 200, f"Password reset failed: {status}, {reset}"
    assert employee("/api/v2/auth/me")[0] == 401, "Password reset did not revoke the old employee session"
    login(employee, username, reset_password)
    status, locked = admin(f"/api/v2/admin/staff/{staff_id}/status", "POST", {"hanhDong": "KHOA"}, owner_csrf)
    assert status == 200 and locked["trang_thai"] == "KHOA", locked
    assert employee("/api/v2/auth/me")[0] == 401, "Lock did not revoke the employee session"
    status, unlocked = admin(f"/api/v2/admin/staff/{staff_id}/status", "POST", {"hanhDong": "MO_KHOA"}, owner_csrf)
    assert status == 200 and unlocked["trang_thai"] == "HOAT_DONG", unlocked
    owner_rows = expect(admin, "/api/v2/admin/staff")["items"]
    owner_row = next(x for x in owner_rows if x["vai_tro"] == "CHU_DOI_XE")
    assert owner_row["trang_thai"] == "HOAT_DONG"
    status, _ = admin(f"/api/v2/admin/staff/{owner_row['ma_tk']}/status", "POST", {"hanhDong": "KHOA"}, owner_csrf)
    assert status == 409, f"Staff API must not manage the owner account: HTTP {status}"
    employee_again = client(base)
    _, employee_csrf = login(employee_again, username, reset_password)
    profile = expect(employee_again, "/api/v2/profile")
    assert profile["vai_tro"] == "TONG_DAI"
    changed_password = "Stage5_Changed_2026!"
    status, _ = employee_again("/api/v2/auth/change-password", "POST",
                               {"matKhauCu": reset_password, "matKhauMoi": changed_password}, employee_csrf)
    assert status == 204, f"Self-service password change failed: HTTP {status}"
    assert employee_again("/api/v2/auth/me")[0] == 401, "Self-service password change kept the old session"
    login(employee_again, username, changed_password)
    print("Staff create/edit/reset/lock/unlock, session revocation and active-owner invariant OK", flush=True)

    profile = expect(admin, "/api/v2/profile")
    changed = {"hoTen": profile["ho_ten"] + " Test", "soDienThoai": profile.get("so_dien_thoai"), "email": profile.get("email")}
    status, edited = admin("/api/v2/profile", "POST", changed, owner_csrf)
    assert status == 200 and edited["ho_ten"] == changed["hoTen"], edited
    original = {"hoTen": profile["ho_ten"], "soDienThoai": profile.get("so_dien_thoai"), "email": profile.get("email")}
    assert admin("/api/v2/profile", "POST", original, owner_csrf)[0] == 200
    print("Live profile read/update and audit path OK", flush=True)


if __name__ == "__main__":
    main()
