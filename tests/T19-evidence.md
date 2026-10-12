# T19 — Dấu vết log người dùng cung cấp

Các SHA-256 sau xác định file log gốc gửi trong phiên; chỉ giữ dòng kết quả, không sao chép credential. Kết quả invariant trước reset được người dùng gửi trực tiếp trong chat tại HEAD f3b94f1.

## Java final 73 tests

SHA-256: `e9447219d9b7f6b49dbf6ebb2562a89f8644c2d00cbf43504340653dceb2b374`

```text
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 3.171 s -- in com.miniongvang.auth.AuthServiceIntegrationTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.042 s -- in com.miniongvang.infrastructure.SqlServerIntegrationTest
[INFO] Tests run: 54, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 14.19 s -- in com.miniongvang.persistence.DesignV1IntegrationTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.195 s -- in com.miniongvang.persistence.PasswordHasherTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.002 s -- in com.miniongvang.quote.FareCalculatorTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.049 s -- in com.miniongvang.route.GoongRouteProviderTest
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.005 s -- in com.miniongvang.route.RouteServiceTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.012 s -- in com.miniongvang.service.RevenueExcelExporterTest
[INFO] Tests run: 73, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
[INFO] Finished at: 2026-10-12T16:08:21+07:00
```

## HTTP V4 255 checks

SHA-256: `30c077853f3d2e7fac931bb0f58b5d595019f3222d04ba0ca27df3a7f02764d7`

```text
PASS: deployed spec matches source; Swagger HTML and all JS/CSS served; real BE/DB health=200 connected.
PASS: 24 HTTP checks; session/CSRF, validation, quote checking, order schema, retries and concurrent creation.
PASS: 27 T16 HTTP checks; ownership, pagination, filters, totals and OrderDetail schema.
T13 cancellation smoke: 34 HTTP checks passed
PASS: 53 T17 HTTP checks; admin permissions, filters, actual receipts, unallocated receipts and matching XLSX.
T14 payment smoke: 32 HTTP checks passed
PASS: 85 T11 HTTP checks; role/session/CSRF, schema, filtering, assignment/rejection and two 8-request races.
```

## Progress V4 93 checks and invariant

SHA-256: `9d1c785708f9f6aed834aefe8c680bfec232121f58a970425ef5ac6d02a68896`

```text
[INFO] BUILD SUCCESS
[INFO] Finished at: 2026-10-12T15:54:08+07:00
PASS: deployed spec matches source; Swagger HTML and all JS/CSS served; real BE/DB health=200 connected.
T12 progress smoke: 93 HTTP checks passed
designV1 invariant reconciliation passed
```

