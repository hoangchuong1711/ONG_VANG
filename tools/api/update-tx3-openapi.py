"""Refresh implemented TX3 contracts and examples after backend DTO changes."""
import json
from pathlib import Path

path = Path(__file__).parents[2] / "src/backend/src/main/webapp/openapi.json"
document = json.loads(path.read_text(encoding="utf-8"))
document["info"]["version"] = "0.6.0"
document["info"]["description"] = (
    "DesignV1 API with TX3 route based ordering, versioned km/kg fares and DB order history. "
    "Goong requires a server side key; FAKE routes are finite demo fixtures."
)
schemas = document["components"]["schemas"]
order_responses = document["paths"]["/api/orders"]["post"]["responses"]
order_errors = document["paths"]["/api/orders"]["post"]["x-error-codes"]
for status in ("502", "504"):
    order_responses.pop(status, None)
    order_errors.pop(status, None)
order_errors["422"] = ["WEIGHT_LIMIT_EXCEEDED"]
order_responses["422"]["description"] = "WEIGHT_LIMIT_EXCEEDED when policy changes before order creation"
order_responses["422"]["content"]["application/json"]["examples"] = {
    "WEIGHT_LIMIT_EXCEEDED": {"value": {
        "code": "WEIGHT_LIMIT_EXCEEDED", "message": "Khối lượng vượt giới hạn biểu phí.",
        "fieldErrors": [], "traceId": "trace-demo-001",
    }}
}
schemas["Route"]["properties"]["nguon"]["enum"] = ["FAKE", "GOONG"]
money = {"$ref": "#/components/schemas/Money"}
decimal = {"$ref": "#/components/schemas/Decimal"}
fare = schemas["Fare"]
fare["required"].extend(["cuocKm", "cuocKhoiLuong", "tongKhoiLuongKg", "maBieuPhi", "phienBanBieuPhi"])
fare["properties"].update({
    "cuocKm": money, "cuocKhoiLuong": money, "tongKhoiLuongKg": decimal,
    "maBieuPhi": {"type": ["string", "null"]},
    "phienBanBieuPhi": {"type": "integer", "minimum": 0},
})
choice = {"type": "string", "enum": ["NGUOI_DAT", "NGUOI_NHAN"], "default": "NGUOI_DAT"}
method = {"type": "string", "enum": ["TIEN_MAT", "VNPAY_QR"], "default": "TIEN_MAT"}
for name in ("QuoteRequest", "CreateOrder"):
    schemas[name]["properties"]["benThanhToan"] = choice
    schemas[name]["properties"]["phuongThucThanhToan"] = method
schemas["CreateOrder"]["properties"]["tenNguoiNhan"] = {"type": "string", "minLength": 1, "maxLength": 100}
for name in ("Order", "OrderDetail"):
    schema = schemas[name]
    schema["required"].extend(["tenNguoiNhan", "benThanhToan", "phuongThucThanhToan", "nguonLoTrinh"])
    schema["properties"].update({
        "tenNguoiNhan": {"type": ["string", "null"], "maxLength": 100},
        "benThanhToan": choice, "phuongThucThanhToan": method,
        "nguonLoTrinh": {"type": "string", "enum": ["FAKE", "GOONG"]},
    })
history = schemas["HistoryFarePolicy"]
history["required"].extend(["phienBan", "kgBaoGom", "donGiaKg", "kgToiDa"])
history["properties"].update({
    "phienBan": {"type": "integer", "minimum": 1}, "kgBaoGom": decimal,
    "donGiaKg": money, "kgToiDa": decimal,
})

def enrich(node):
    if isinstance(node, dict):
        if "cuocGoc" in node and "tongCuoc" in node:
            node.setdefault("cuocKm", node["cuocGoc"])
            node.setdefault("cuocKhoiLuong", "0.00")
            node.setdefault("tongKhoiLuongKg", "1.00")
            node.setdefault("maBieuPhi", "CUOC-DEMO-1")
            node.setdefault("phienBanBieuPhi", 1)
        if "maDon" in node and "cuoc" in node and "trangThai" in node:
            node.setdefault("tenNguoiNhan", "Người nhận demo")
            node.setdefault("benThanhToan", "NGUOI_DAT")
            node.setdefault("phuongThucThanhToan", "TIEN_MAT")
            node.setdefault("nguonLoTrinh", "FAKE")
        if "maBieuPhi" in node and "donGiaKm" in node and "kmToiThieu" in node:
            node.setdefault("phienBan", 1)
            node.setdefault("kgBaoGom", "1.00")
            node.setdefault("donGiaKg", "3000.00")
            node.setdefault("kgToiDa", "30.00")
        if "diemLayHang" in node and "diemGiaoHang" in node and "kienHang" in node:
            node.setdefault("benThanhToan", "NGUOI_DAT")
            node.setdefault("phuongThucThanhToan", "TIEN_MAT")
            if "maBaoGia" in node:
                node.setdefault("tenNguoiNhan", "Người nhận demo")
        if node.get("nguon") == "GIA_LAP":
            node["nguon"] = "FAKE"
        for value in node.values():
            enrich(value)
    elif isinstance(node, list):
        for value in node:
            enrich(value)

enrich(document)
for schema in schemas.values():
    if isinstance(schema, dict) and "required" in schema:
        schema["required"] = list(dict.fromkeys(schema["required"]))
path.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
