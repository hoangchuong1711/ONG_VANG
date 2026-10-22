"""Mutating admin concurrency smoke. Use only with the isolated designV2 test DB."""

import argparse
import concurrent.futures
import http.cookiejar
import json
import os
import threading
import urllib.error
import urllib.request
import uuid


def client(base):
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def call(path, method="GET", body=None, csrf=None, headers=None):
        request_headers = dict(headers or {})
        if body is not None:
            request_headers["Content-Type"] = "application/json"
        if csrf:
            request_headers["X-CSRF-Token"] = csrf
        request = urllib.request.Request(
            base + path,
            data=json.dumps(body).encode() if body is not None else None,
            method=method,
            headers=request_headers,
        )
        try:
            response = opener.open(request, timeout=20)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            payload = response.read()
            content_type = response.headers.get("Content-Type", "")
            return response.status, json.loads(payload) if "application/json" in content_type else payload

    return call


def expect(call, path, method="GET", body=None, csrf=None, status=200, headers=None):
    actual, payload = call(path, method, body, csrf, headers)
    if actual != status:
        raise AssertionError(f"{method} {path}: HTTP {actual}, expected {status}: {payload}")
    return payload


def login(base, username, password):
    call = client(base)
    csrf = expect(call, "/api/v2/auth/csrf")["token"]
    session = expect(call, "/api/v2/auth/login", "POST",
                     {"username": username, "password": password}, csrf)
    return call, session, expect(call, "/api/v2/auth/csrf")["token"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:8082")
    parser.add_argument("--expected-database", default="mini_ong_vang_design_v2_test_admin")
    parser.add_argument("--driver", required=True, help="Fresh driver created by the profile smoke")
    parser.add_argument("--dispatcher", default="demo_dispatcher")
    args = parser.parse_args()
    owner_password = os.environ.get("V2_SMOKE_PASSWORD")
    driver_password = os.environ.get("V2_SMOKE_DRIVER_PASSWORD")
    dispatcher_password = os.environ.get("V2_SMOKE_DISPATCHER_PASSWORD")
    if not owner_password or not driver_password or not dispatcher_password:
        raise SystemExit("Set V2_SMOKE_PASSWORD, V2_SMOKE_DRIVER_PASSWORD and V2_SMOKE_DISPATCHER_PASSWORD")

    base = args.base.rstrip("/")
    health = expect(client(base), "/api/health")
    assert health["databaseName"] == args.expected_database, health
    owner, owner_session, owner_csrf = login(base, "test_admin", owner_password)
    assert owner_session["vaiTro"] == "CHU_DOI_XE"
    driver, driver_session, driver_csrf = login(base, args.driver, driver_password)
    assert driver_session["vaiTro"] == "TAI_XE"
    expect(driver, "/api/v2/drivers/me/availability", "POST", {"online": True}, driver_csrf)

    order_id = None
    try:
        customers = expect(owner, "/api/v2/admin/customers")["items"]
        assert customers, "Test DB needs at least one customer fixture"
        quote_body = {
            "maKh": customers[0]["ma_kh"],
            "diemLay": "Quận 1, TP.HCM",
            "diemGiao": "Quận 3, TP.HCM",
            "kienHang": [{"loaiHang": "Kiểm thử trạng thái", "kg": "1"}],
        }
        quote = expect(owner, "/api/v2/fare/quote", "POST", quote_body, owner_csrf)
        create_body = {
            **quote_body,
            "giaDaDongY": quote["tongCuoc"],
            "tenNguoiNhan": "Smoke stage6",
            "sdtNguoiNhan": "0900000099",
        }
        idempotency_key = str(uuid.uuid4())
        first = expect(owner, "/api/v2/orders", "POST", create_body, owner_csrf,
                       status=201, headers={"Idempotency-Key": idempotency_key})
        retry = expect(owner, "/api/v2/orders", "POST", create_body, owner_csrf,
                       status=201, headers={"Idempotency-Key": idempotency_key})
        order_id = first["ma_don"]
        assert retry["ma_don"] == order_id, (first, retry)

        driver_rows = expect(owner, "/api/v2/admin/drivers")["items"]
        selected = next(item for item in driver_rows if item["username"] == args.driver)
        expect(owner, f"/api/v2/orders/{order_id}/assign", "POST",
               {"maTx": selected["ma_tx"]}, owner_csrf, status=403)
        barrier = threading.Barrier(2)

        def assign_once():
            call, session, csrf = login(base, args.dispatcher, dispatcher_password)
            assert session["vaiTro"] == "TONG_DAI"
            barrier.wait(timeout=10)
            return call(f"/api/v2/orders/{order_id}/assign", "POST",
                        {"maTx": selected["ma_tx"]}, csrf)[0]

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            statuses = list(pool.map(lambda _: assign_once(), range(2)))
        assert sorted(statuses) == [200, 409], f"Expected one assignment success and one conflict, got {statuses}"
        detail = expect(owner, f"/api/v2/orders/{order_id}")
        assert detail["trang_thai"] == "DA_GAN", detail
        active = [item for item in detail["lich_su_phan_cong"] if item["ket_thuc_luc"] is None]
        assert len(active) == 1, active

        lock_status, lock_result = owner(f"/api/v2/admin/drivers/{selected['ma_tx']}/status", "POST",
                                         {"hanhDong": "KHOA"}, owner_csrf)
        assert lock_status == 409, f"Driver with active assignment must not be locked: {lock_status} {lock_result}"

        cancel = expect(owner, f"/api/v2/orders/{order_id}/cancel", "POST",
                        {"lyDo": "Kiểm thử giai đoạn 6; hủy để dọn fixture"}, owner_csrf)
        assert cancel["trang_thai"] == "DA_HUY", cancel
        order_id = None

        race_order = expect(owner, "/api/v2/orders", "POST", create_body, owner_csrf, status=201,
                            headers={"Idempotency-Key": str(uuid.uuid4())})
        order_id = race_order["ma_don"]
        barrier = threading.Barrier(2)

        def assign_while_cancelling():
            call, _, csrf = login(base, args.dispatcher, dispatcher_password)
            barrier.wait(timeout=10)
            return call(f"/api/v2/orders/{order_id}/assign", "POST",
                        {"maTx": selected["ma_tx"]}, csrf)

        def cancel_while_assigning():
            call, _, csrf = login(base, "test_admin", owner_password)
            barrier.wait(timeout=10)
            return call(f"/api/v2/orders/{order_id}/cancel", "POST",
                        {"lyDo": "Kiểm thử đua phân công/hủy giai đoạn 6"}, csrf)

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            assign_future = pool.submit(assign_while_cancelling)
            cancel_future = pool.submit(cancel_while_assigning)
            assign_result, cancel_result = assign_future.result(), cancel_future.result()
        assert assign_result[0] in (200, 409), assign_result
        assert cancel_result[0] in (200, 409), cancel_result
        detail = expect(owner, f"/api/v2/orders/{order_id}")
        assert detail["trang_thai"] == "DA_HUY", detail
        assert not any(item["ket_thuc_luc"] is None for item in detail["lich_su_phan_cong"]), detail
        order_id = None
        print("OK: idempotent create retry, concurrent assignment (one success/one conflict), concurrent assign/cancel, active-driver lock rejection and cleanup")
    finally:
        if order_id:
            owner(f"/api/v2/orders/{order_id}/cancel", "POST",
                  {"lyDo": "Dọn fixture kiểm thử giai đoạn 6"}, owner_csrf)
        driver("/api/v2/drivers/me/availability", "POST", {"online": False}, driver_csrf)


if __name__ == "__main__":
    main()
