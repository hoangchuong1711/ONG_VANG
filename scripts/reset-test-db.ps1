$ErrorActionPreference = 'Stop'

if ($env:REQUIRE_TEST_DB -ne 'true' -or
    $env:TEST_DB_URL -notmatch '^jdbc:sqlserver://(127\.0\.0\.1|localhost):15433;databaseName=mini_ong_vang_test;encrypt=true;trustServerCertificate=true$' -or
    $env:TEST_DB_USER -ne 'sa' -or
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
$databaseName = docker compose -f $composeFile exec -T db-test /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -b -d mini_ong_vang_test -h -1 -W -Q 'SET NOCOUNT ON; SELECT DB_NAME()'
if ($LASTEXITCODE -ne 0 -or $databaseName.Trim() -ne 'mini_ong_vang_test') {
    throw 'Database identity check failed; reset cancelled.'
}

$sql = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'reset-test-db.sql')
$sql | docker compose -f $composeFile exec -T db-test /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -b -d mini_ong_vang_test
if ($LASTEXITCODE -ne 0) { throw 'Test data reset failed.' }

mvn.cmd --batch-mode --no-transfer-progress -f (Join-Path $projectRoot 'src/backend/pom.xml') `
    compile exec:java '-Dexec.mainClass=com.miniongvang.seed.SeedCommand' '-Dexec.args=test'
if ($LASTEXITCODE -ne 0) { throw 'Test data seed failed.' }
Write-Output 'Test database reset and demo seed completed.'
