"""Mutating pagination smoke. Creates and cancels orders only in the isolated test DB."""

import argparse
import http.cookiejar
import json
import os
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
        request = urllib.request.Request(base + path,
                                         data=json.dumps(body).encode() if body is not None else None,
                                         method=method, headers=request_headers)
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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:8082")
    parser.add_argument("--expected-database", default="mini_ong_vang_design_v2_test_admin")
    parser.add_argument("--count", type=int, default=101)
    args = parser.parse_args()
    password = os.environ.get("V2_SMOKE_PASSWORD")
    if not password:
        raise SystemExit("Set V2_SMOKE_PASSWORD in this process environment")
    if args.count < 101 or args.count > 250:
        raise SystemExit("count must be between 101 and 250")

    base = args.base.rstrip("/")
    owner = client(base)
    health = expect(owner, "/api/health")
    assert health["databaseName"] == args.expected_database, health
    csrf = expect(owner, "/api/v2/auth/csrf")["token"]
    login = expect(owner, "/api/v2/auth/login", "POST",
                   {"username": "test_admin", "password": password}, csrf)
    assert login["vaiTro"] == "CHU_DOI_XE"
    csrf = expect(owner, "/api/v2/auth/csrf")["token"]

    before = expect(owner, "/api/v2/admin/orders?page=0&size=1")["total"]
    customers = expect(owner, "/api/v2/admin/customers")["items"]
    assert customers, "Test DB needs a customer fixture"
    quote_body = {"maKh": customers[0]["ma_kh"], "diemLay": "Quận 1, TP.HCM",
                  "diemGiao": "Quận 3, TP.HCM",
                  "kienHang": [{"loaiHang": "Kiểm tra phân trang", "kg": "1"}]}
    quote = expect(owner, "/api/v2/fare/quote", "POST", quote_body, csrf)
    order_ids = []
    try:
        for index in range(args.count):
            body = {**quote_body, "giaDaDongY": quote["tongCuoc"],
                    "tenNguoiNhan": f"Pagination smoke {index + 1}",
                    "sdtNguoiNhan": "0900000099"}
            created = expect(owner, "/api/v2/orders", "POST", body, csrf, status=201,
                             headers={"Idempotency-Key": str(uuid.uuid4())})
            order_ids.append(created["ma_don"])
        expected_total = before + args.count
        first = expect(owner, "/api/v2/admin/orders?page=0&size=100")
        second = expect(owner, "/api/v2/admin/orders?page=1&size=100")
        assert first["total"] == second["total"] == expected_total, (before, first, second)
        assert len(first["items"]) == 100 and len(second["items"]) == expected_total - 100
        print(f"OK: server pagination returned total={expected_total}, page 0=100 and page 1={len(second['items'])}")
    finally:
        for order_id in order_ids:
            status, payload = owner(f"/api/v2/orders/{order_id}/cancel", "POST",
                                   {"lyDo": "Dọn fixture kiểm tra phân trang giai đoạn 6"}, csrf)
            if status != 200 or payload.get("trang_thai") != "DA_HUY":
                raise AssertionError(f"Could not cancel test order {order_id}: HTTP {status}, {payload}")
        print(f"Cancelled {len(order_ids)} generated orders in the isolated test DB")


if __name__ == "__main__":
    main()
