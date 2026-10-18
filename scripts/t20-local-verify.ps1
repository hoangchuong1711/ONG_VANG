# Disposable SQL Server verification for the current DesignV2 backend gate.
# Run from the repository root in PowerShell with Docker Desktop started.
$ErrorActionPreference = 'Stop'
$bytes = New-Object byte[] 20
$random = [Security.Cryptography.RandomNumberGenerator]::Create()
$random.GetBytes($bytes)
$random.Dispose()
$env:TEST_DB_PASSWORD = 'Aa!' + [BitConverter]::ToString($bytes).Replace('-', '')
$env:TEST_DB_URL = 'jdbc:sqlserver://127.0.0.1:15433;databaseName=mini_ong_vang_design_v2_test;encrypt=true;trustServerCertificate=true'
$env:TEST_DB_USER = 'sa'
$env:REQUIRE_TEST_DB = 'true'
$env:API_BASE_URL = 'http://127.0.0.1:18081'
$env:API_EXPECTED_DATABASE = 'mini_ong_vang_design_v2_test'
$env:V2_SMOKE_PASSWORD = '12345678'
$existing = docker ps --filter label=com.docker.compose.project=mini-ong-vang-ci --format '{{.Names}}'
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect existing Docker test containers' }
if ($existing) { throw 'The mini-ong-vang-ci stack is already running; stop it separately before this disposable run' }

function Assert-Exit([string] $label) {
    if ($LASTEXITCODE -ne 0) { throw "$label failed with exit code $LASTEXITCODE" }
    Write-Output "PASS $label"
}

function Invoke-TestSql([string] $source, [string] $destination) {
    docker compose -f docker-compose.ci.yml cp $source "db-test:$destination"
    Assert-Exit "copy $source"
    docker compose -f docker-compose.ci.yml exec -T db-test /opt/mssql-tools18/bin/sqlcmd `
        -S localhost -U sa -C -I -b -d mini_ong_vang_design_v2_test -i $destination
    Assert-Exit "run $source"
}

try {
    docker compose -f docker-compose.ci.yml up --wait --wait-timeout 180 db-test | Select-Object -Last 5
    Assert-Exit 'db-test startup'
    docker compose -f docker-compose.ci.yml up --no-deps --exit-code-from db-init-test db-init-test | Select-Object -Last 8
    Assert-Exit 'db migration'
    mvn.cmd --batch-mode --no-transfer-progress -f src/backend/pom.xml verify | Select-Object -Last 22
    Assert-Exit 'Maven integration verify'

    Invoke-TestSql 'src/backend/src/main/resources/db/designV2/sqlserver/demo/V9__insert_demo_data.sql' '/tmp/designv2-V9.sql'
    Invoke-TestSql 'src/backend/src/main/resources/db/designV2/sqlserver/demo/V10__update_demo_credentials_and_positions.sql' '/tmp/designv2-V10.sql'
    Invoke-TestSql 'src/backend/src/main/resources/db/designV2/sqlserver/demo/V11__fix_demo_account_password_hash.sql' '/tmp/designv2-V11.sql'
    Invoke-TestSql 'src/backend/src/main/resources/db/designV2/sqlserver/demo/V17__restore_demo_password_hash.sql' '/tmp/designv2-V17.sql'
    Invoke-TestSql 'src/backend/src/main/resources/db/designV2/sqlserver/demo/V18__seed_demo_operating_config.sql' '/tmp/designv2-V18.sql'
    Invoke-TestSql 'src/backend/src/main/resources/db/designV2/sqlserver/demo/V19__change_demo_account_password.sql' '/tmp/designv2-V19.sql'
    docker compose -f docker-compose.ci.yml up --build --wait --wait-timeout 120 backend-test | Select-Object -Last 8
    Assert-Exit 'backend startup'
    $ready = $false
    for ($attempt = 1; $attempt -le 30; $attempt++) {
        curl.exe --fail --silent --max-time 2 "$env:API_BASE_URL/api/health" | Out-Null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 2
    }
    if (-not $ready) {
        docker compose -f docker-compose.ci.yml logs --tail=100 backend-test
        throw 'DesignV2 API did not become ready.'
    }

    python tools/api/design-v2-admin-directory-smoke.py --base $env:API_BASE_URL --expected-database $env:API_EXPECTED_DATABASE
    Assert-Exit 'DesignV2 admin directory smoke'
    python tools/api/design-v2-admin-ops-smoke.py --base $env:API_BASE_URL
    Assert-Exit 'DesignV2 admin operations smoke'
    python tools/api/design-v2-admin-finance-smoke.py --base $env:API_BASE_URL
    Assert-Exit 'DesignV2 finance report smoke'
    Invoke-TestSql 'src/backend/src/main/resources/db/designV2/sqlserver/demo/V20__remove_legacy_demo_orders.sql' '/tmp/designv2-V20.sql'
} catch {
    Write-Error "T20 verification failed: $_"
    exit 1
} finally {
    docker compose -f docker-compose.ci.yml down --volumes --remove-orphans | Select-Object -Last 5
    Remove-Item Env:TEST_DB_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:V2_SMOKE_PASSWORD -ErrorAction SilentlyContinue
}
