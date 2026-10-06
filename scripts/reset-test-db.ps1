$ErrorActionPreference = 'Stop'

if ($env:REQUIRE_TEST_DB -ne 'true' -or
    $env:TEST_DB_URL -notmatch '^jdbc:postgresql://(127\.0\.0\.1|localhost):15433/mini_ong_vang_test$' -or
    $env:TEST_DB_USER -ne 'mini_ong_vang_test' -or
    [string]::IsNullOrWhiteSpace($env:TEST_DB_PASSWORD) -or
    [string]::IsNullOrWhiteSpace($env:DEMO_PASSWORD)) {
    throw 'Set REQUIRE_TEST_DB=true, TEST_DB_URL/USER/PASSWORD for the dedicated CI database, and DEMO_PASSWORD.'
}
if ([System.Text.Encoding]::UTF8.GetByteCount($env:DEMO_PASSWORD) -gt 72) {
    throw 'DEMO_PASSWORD must be at most 72 UTF-8 bytes.'
}

$projectRoot = Split-Path $PSScriptRoot -Parent
$composeFile = Join-Path $projectRoot 'docker-compose.ci.yml'
docker compose -f $composeFile stop backend-test
if ($LASTEXITCODE -ne 0) { throw 'Could not stop the test backend before reset.' }
$databaseName = docker compose -f $composeFile exec -T db-test psql -U mini_ong_vang_test -d mini_ong_vang_test -Atqc 'SELECT current_database()'
if ($LASTEXITCODE -ne 0 -or $databaseName.Trim() -ne 'mini_ong_vang_test') {
    throw 'Database identity check failed; reset cancelled.'
}

$sql = @'
BEGIN;
TRUNCATE TABLE
  danh_gia_chuyen_di, thanh_toan, nhat_ky_trang_thai,
  chi_tiet_kien_hang, phu_thu_don_hang, snapshot_cuoc_don_hang,
  phan_cong_don_hang, don_hang, khach_hang_vip, phuong_tien,
  dieu_phoi_vien, tai_xe, khach_hang, cau_hinh_phu_thu,
  cau_hinh_cuoc, hang_thanh_vien, tai_khoan, demo_seed_manifest;
COMMIT;
'@
$sql | docker compose -f $composeFile exec -T db-test psql -v ON_ERROR_STOP=1 -U mini_ong_vang_test -d mini_ong_vang_test
if ($LASTEXITCODE -ne 0) { throw 'Test data reset failed.' }

mvn.cmd --batch-mode --no-transfer-progress -f (Join-Path $projectRoot 'src/backend/pom.xml') `
    compile exec:java '-Dexec.mainClass=com.miniongvang.seed.SeedCommand' '-Dexec.args=test'
if ($LASTEXITCODE -ne 0) { throw 'Test data seed failed.' }
Write-Output 'Test database reset and demo seed completed.'
