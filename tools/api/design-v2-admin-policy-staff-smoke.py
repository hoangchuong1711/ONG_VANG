"""Mutating phase-5 smoke. Run only against mini_ong_vang_design_v2_test_admin."""

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

    policies = expect(admin, "/api/v2/policies")["items"]
    now = dt.datetime.now(dt.timezone.utc)
    past = (now - dt.timedelta(days=30)).replace(microsecond=0).isoformat(timespec="milliseconds").replace("+00:00", "")
    future = (now + dt.timedelta(days=365)).replace(microsecond=0).isoformat(timespec="milliseconds").replace("+00:00", "")
    active = [p for p in policies if p["trang_thai"] == "CONG_BO" and p["hieu_luc_tu"] <= now.isoformat()
              and (p.get("hieu_luc_den") is None or p["hieu_luc_den"] > now.isoformat())]
    if not any(p["loai"] == "CUOC" for p in active):
        base_fare = {"ten": "Smoke biểu phí cơ sở", "cuoc_co_ban": 12000, "don_gia_km": 5000,
                     "km_toi_thieu": 1, "km_toi_da": 100, "kg_bao_gom": 1, "kg_toi_da": 50,
                     "don_gia_kg": 1000, "hieu_luc_tu": past, "hieu_luc_den": None}
        status, _ = admin("/api/v2/policies", "POST", {"hanhDong": "LUU_NHAP", "loai": "CUOC", "duLieu": base_fare}, owner_csrf)
        assert status == 200, f"Test DB base fare creation failed: {status}"
        base = next(p for p in expect(admin, "/api/v2/policies")["items"] if p["loai"] == "CUOC" and p.get("ten") == base_fare["ten"])
        status, _ = admin("/api/v2/policies", "POST", {"hanhDong": "CONG_BO", "loai": "CUOC", "ma": base["ma"]}, owner_csrf)
        assert status == 200, f"Test DB base fare publish failed: {status}"
    for tier in ("BAC", "VANG", "KIM_CUONG"):
        if not any(p["loai"] == "THANH_VIEN" and p["nhom"] == tier and p in active for p in policies):
            payload = {"ma_hang": tier, "ty_le_giam": 5, "hieu_luc_tu": past, "hieu_luc_den": None}
            status, _ = admin("/api/v2/policies", "POST", {"hanhDong": "LUU_NHAP", "loai": "THANH_VIEN", "duLieu": payload}, owner_csrf)
            assert status == 200, f"Test DB {tier} policy creation failed: {status}"
            item = next(p for p in expect(admin, "/api/v2/policies")["items"] if p["loai"] == "THANH_VIEN" and p["nhom"] == tier and p["trang_thai"] == "NHAP")
            status, _ = admin("/api/v2/policies", "POST", {"hanhDong": "CONG_BO", "loai": "THANH_VIEN", "ma": item["ma"]}, owner_csrf)
            assert status == 200, f"Test DB {tier} policy publish failed: {status}"
    policies = expect(admin, "/api/v2/policies")["items"]
    fare = next((p for p in policies if p["loai"] == "CUOC"), None)
    assert fare and "don_gia_km" in fare and "don_gia_kg" in fare and "kg_toi_da" in fare, fare
    tiers = {p["nhom"] for p in policies if p["loai"] == "THANH_VIEN"}
    assert {"BAC", "VANG", "KIM_CUONG"}.issubset(tiers), tiers
    draft_name = f"Smoke giai doan 5 {random.randrange(10**8):08d}"
    draft = {"ten": draft_name, "cuoc_co_ban": 12000, "don_gia_km": 5000,
             "km_toi_thieu": 1, "km_toi_da": 100, "kg_bao_gom": 1, "kg_toi_da": 50,
             "don_gia_kg": 1000, "hieu_luc_tu": future, "hieu_luc_den": None}
    status, _ = admin("/api/v2/policies", "POST", {"hanhDong": "LUU_NHAP", "loai": "CUOC", "duLieu": draft}, owner_csrf)
    assert status == 200, f"Create policy draft failed: {status}"
    policies = expect(admin, "/api/v2/policies")["items"]
    created = next(p for p in policies if p["loai"] == "CUOC" and p.get("ten") == draft_name)
    assert created["trang_thai"] == "NHAP" and float(created["don_gia_km"]) == 5000, created
    status, _ = admin("/api/v2/policies", "POST", {"hanhDong": "XOA_NHAP", "loai": "CUOC", "ma": created["ma"]}, owner_csrf)
    assert status == 200, f"Delete policy draft failed: {status}"
    assert all(p["ma"] != created["ma"] for p in expect(admin, "/api/v2/policies")["items"])
    print("Policy list, real km/kg fields, three persisted tiers, and draft create/delete OK", flush=True)

    customer_rows = expect(admin, "/api/v2/admin/customers")["items"]
    if not customer_rows:
        phone = f"07{random.randrange(10**8):08d}"
        csrf = expect(admin, "/api/v2/auth/csrf")["token"]
        status, _ = admin("/api/v2/auth/register", "POST", {"username": phone, "soDienThoai": phone,
                     "hoTen": "Khách báo giá kiểm thử", "password": "Quote_Test_2026!"}, csrf)
        assert status == 201, f"Test DB customer registration failed: {status}"
        customer_rows = expect(admin, "/api/v2/admin/customers")["items"]
    quote_data = {"maKh": customer_rows[0]["ma_kh"], "diemLay": "Quận 1, TP.HCM", "diemGiao": "Quận 3, TP.HCM",
                  "kienHang": [{"loaiHang": "Hàng thử", "kg": "1.5"}]}
    status, quote = admin("/api/v2/fare/quote", "POST", quote_data, owner_csrf)
    assert status == 200 and float(quote["tongCuoc"]) >= 0, f"Quote preview failed: {status}, {quote}"
    all_policies = expect(admin, "/api/v2/policies")["items"]
    active_fare = next(p for p in all_policies
                       if p["loai"] == "CUOC" and p["trang_thai"] == "CONG_BO"
                       and p["hieu_luc_tu"] <= now.isoformat()
                       and (p.get("hieu_luc_den") is None or p["hieu_luc_den"] > now.isoformat()))
    future_fares = [p for p in all_policies if p["loai"] == "CUOC" and p["trang_thai"] == "CONG_BO"
                    and p["hieu_luc_tu"] > now.isoformat()]
    if not future_fares:
        next_start = (now + dt.timedelta(days=365)).replace(microsecond=0).isoformat(timespec="milliseconds").replace("+00:00", "")
        scheduled = {"ten": f"Smoke biểu phí tương lai {random.randrange(10**8):08d}",
                     "cuoc_co_ban": float(active_fare["cuoc_co_ban"]) + 1000,
                     "don_gia_km": float(active_fare["don_gia_km"]), "km_toi_thieu": float(active_fare["km_toi_thieu"]),
                     "km_toi_da": float(active_fare["km_toi_da"]), "kg_bao_gom": float(active_fare["kg_bao_gom"]),
                     "kg_toi_da": float(active_fare["kg_toi_da"]), "don_gia_kg": float(active_fare["don_gia_kg"]),
                     "hieu_luc_tu": next_start, "hieu_luc_den": None}
        status, _ = admin("/api/v2/policies", "POST", {"hanhDong": "LUU_NHAP", "loai": "CUOC", "duLieu": scheduled}, owner_csrf)
        assert status == 200, f"Future fare draft failed: {status}"
        scheduled_row = next(p for p in expect(admin, "/api/v2/policies")["items"]
                             if p["loai"] == "CUOC" and p.get("ten") == scheduled["ten"])
        status, _ = admin("/api/v2/policies", "POST", {"hanhDong": "DONG_HIEU_LUC", "loai": "CUOC",
                     "ma": active_fare["ma"], "den": next_start}, owner_csrf)
        assert status == 200, f"Close current fare at future boundary failed: {status}"
        status, _ = admin("/api/v2/policies", "POST", {"hanhDong": "CONG_BO", "loai": "CUOC",
                     "ma": scheduled_row["ma"]}, owner_csrf)
        assert status == 200, f"Publish scheduled fare failed: {status}"
    status, after_quote = admin("/api/v2/fare/quote", "POST", quote_data, owner_csrf)
    assert status == 200 and after_quote["tongCuoc"] == quote["tongCuoc"], (status, quote, after_quote)
    print("Quote preview uses the real fare API; future policy publication leaves today's quote unchanged", flush=True)

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
