"""Read-only HTTP smoke for designV2 admin finance JSON and Excel.

Set V2_SMOKE_PASSWORD and run with --base/--from/--until if needed.
"""

import argparse
import http.cookiejar
import io
import json
import os
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo


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
            response = opener.open(request, timeout=20)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            payload = response.read()
            content_type = response.headers.get("Content-Type", "")
            result = json.loads(payload) if "application/json" in content_type else payload
            return response.status, result, content_type

    return call


def assert_status(response, expected):
    status, payload, _ = response
    if status != expected:
        raise AssertionError(f"HTTP {status}, expected {expected}: {payload if isinstance(payload, dict) else '<binary>'}")
    return payload


def login(call, username, password):
    csrf = assert_status(call("/api/v2/auth/csrf"), 200)["token"]
    return assert_status(call("/api/v2/auth/login", "POST", {
        "username": username, "password": password,
    }, csrf), 200)


def excel_totals(payload):
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        sheet = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
    ns = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    cells = {cell.attrib["r"]: cell.findtext("x:v", namespaces=ns)
             for cell in sheet.findall(".//x:c", namespaces=ns)}
    return [Decimal(cells[key]) for key in ("C4", "D4", "E4", "F4")]


def main():
    today = datetime.now(ZoneInfo("Asia/Ho_Chi_Minh")).date()
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:3001")
    parser.add_argument("--from", dest="from_day", default=(today - timedelta(days=29)).isoformat())
    parser.add_argument("--until", default=(today + timedelta(days=1)).isoformat())
    parser.add_argument("--owner", default="demo_admin")
    parser.add_argument("--customer", default="0900000001")
    parser.add_argument("--skip-customer-role-check", action="store_true")
    args = parser.parse_args()
    password = os.environ.get("V2_SMOKE_PASSWORD")
    if not password:
        raise SystemExit("Set V2_SMOKE_PASSWORD in this process environment")
    base = args.base.rstrip("/")
    owner = client(base)
    role = login(owner, args.owner, password)["vaiTro"]
    assert role == "CHU_DOI_XE", role
    query = urllib.parse.urlencode({"tu": args.from_day, "den": args.until})
    report = assert_status(owner(f"/api/v2/admin/reports/finance?{query}"), 200)
    workbook = assert_status(owner(f"/api/v2/admin/reports/finance.xlsx?{query}"), 200)
    expected = [Decimal(str(report[key])) for key in (
        "congTyPhatSinh", "thuNhapTaiXePhatSinh", "daNhanVnpay", "conPhaiNopCuoiKy",
    )]
    assert excel_totals(workbook) == expected, "Excel totals differ from JSON"
    payments = assert_status(owner("/api/v2/admin/payments?page=0&size=20"), 200)
    assert payments["giao_dich_total"] >= len(payments["giao_dich"])
    if payments["giao_dich"]:
        payment_id = payments["giao_dich"][0]["ma_giao_dich"]
        events = assert_status(owner(f"/api/v2/admin/payments/{payment_id}/events"), 200)
        for event in events["items"]:
            assert "noi_dung_json" not in event and "khoa_su_kien" not in event
    assert_status(owner("/api/v2/admin/payments?status=INVALID"), 400)
    assert_status(owner("/api/v2/admin/reports/finance?tu=2026-10-19&den=2026-10-18"), 400)
    if not args.skip_customer_role_check:
        customer = client(base)
        assert login(customer, args.customer, password)["vaiTro"] == "KHACH_HANG"
        assert_status(customer(f"/api/v2/admin/reports/finance?{query}"), 403)
        assert_status(customer("/api/v2/admin/payments"), 403)
    role_result = "customer access rejected" if not args.skip_customer_role_check else "customer-role check skipped"
    print(f"OK: owner JSON/Excel totals match; payment events are redacted; invalid input and {role_result}")
    print(f"Period {args.from_day}..{args.until}: company={expected[0]} received={expected[2]} balance={expected[3]}")


if __name__ == "__main__":
    main()
