"""Read-only HTTP smoke for designV2 admin orders, overview and incidents."""

import argparse
import http.cookiejar
import json
import os
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


def expect(call, path, status=200):
    actual, payload = call(path)
    if actual != status:
        raise AssertionError(f"HTTP {actual}, expected {status}: {payload}")
    return payload


def login(call, username, password):
    csrf = expect(call, "/api/v2/auth/csrf")["token"]
    status, payload = call("/api/v2/auth/login", "POST", {"username": username, "password": password}, csrf)
    if status != 200:
        raise AssertionError(f"Login HTTP {status}: {payload}")
    return payload


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:3001")
    parser.add_argument("--owner", default="demo_admin")
    args = parser.parse_args()
    password = os.environ.get("V2_SMOKE_PASSWORD")
    if not password:
        raise SystemExit("Set V2_SMOKE_PASSWORD in this process environment")

    owner = client(args.base.rstrip("/"))
    assert login(owner, args.owner, password)["vaiTro"] == "CHU_DOI_XE"
    page = expect(owner, "/api/v2/admin/orders?page=0&size=2")
    assert page["page"] == 0 and page["size"] == 2 and page["total"] >= len(page["items"])
    assert len(page["items"]) <= 2
    if page["items"]:
        detail = expect(owner, f"/api/v2/orders/{page['items'][0]['ma_don']}")
        assert "kien_hang" in detail and "nhat_ky" in detail and "lich_su_phan_cong" in detail
    last = expect(owner, f"/api/v2/admin/orders?page=1000000&size=2")
    assert not last["items"] and last["total"] == page["total"]
    assert expect(owner, "/api/v2/admin/overview")["tong_don"] >= page["total"]
    incidents = expect(owner, "/api/v2/admin/incidents?page=0&size=2")
    assert incidents["page"] == 0 and incidents["size"] == 2
    assert incidents["total"] >= len(incidents["items"]) and len(incidents["items"]) <= 2

    for path in (
        "/api/v2/admin/orders?page=-1&size=20",
        "/api/v2/admin/incidents?page=0&size=101",
    ):
        status, _ = owner(path)
        assert status == 400, f"{path}: expected 400, got {status}"
    assert owner("/api/v2/admin/orders?status=INVALID")[0] == 400

    print("OK: order paging/detail, overview, incident paging, validation and owner authorization")
    print(f"Orders={page['total']}; incidents={incidents['total']}")


if __name__ == "__main__":
    main()
