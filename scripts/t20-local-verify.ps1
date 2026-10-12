# Disposable SQL Server verification for the T20 backend gate.
# Run from the repository root in PowerShell with Docker Desktop started.
$ErrorActionPreference = 'Stop'
$bytes = New-Object byte[] 20
$random = [Security.Cryptography.RandomNumberGenerator]::Create()
$random.GetBytes($bytes)
$random.Dispose()
$env:TEST_DB_PASSWORD = 'Aa!' + [BitConverter]::ToString($bytes).Replace('-', '')
$env:TEST_DB_URL = 'jdbc:sqlserver://127.0.0.1:15433;databaseName=mini_ong_vang_test;encrypt=true;trustServerCertificate=true'
$env:TEST_DB_USER = 'sa'
$env:REQUIRE_TEST_DB = 'true'
$env:API_BASE_URL = 'http://127.0.0.1:18081'
$env:API_EXPECTED_DATABASE = 'mini_ong_vang_test'
$env:DEMO_PASSWORD = 't20-only-demo-password'
$existing = docker ps --filter label=com.docker.compose.project=mini-ong-vang-ci --format '{{.Names}}'
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect existing Docker test containers' }
if ($existing) { throw 'The mini-ong-vang-ci stack is already running; stop it separately before this disposable run' }

function Assert-Exit([string] $label) {
    if ($LASTEXITCODE -ne 0) { throw "$label failed with exit code $LASTEXITCODE" }
    Write-Output "PASS $label"
}

try {
    docker compose -f docker-compose.ci.yml up --wait --wait-timeout 180 db-test | Select-Object -Last 5
    Assert-Exit 'db-test startup'
    docker compose -f docker-compose.ci.yml up --no-deps --exit-code-from db-init-test db-init-test | Select-Object -Last 8
    Assert-Exit 'db migration'
    mvn.cmd --batch-mode --no-transfer-progress -f src/backend/pom.xml verify | Select-Object -Last 22
    Assert-Exit 'Maven integration verify'

    docker cp scripts/reset-test-db.sql mini-ong-vang-ci-db-test-1:/tmp/reset.sql
    Assert-Exit 'copy reset script'
    docker cp scripts/check-design-v1-invariants.sql mini-ong-vang-ci-db-test-1:/tmp/invariants.sql
    Assert-Exit 'copy invariant script'
    docker compose -f docker-compose.ci.yml exec -T db-test /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -b -d mini_ong_vang_test -i /tmp/reset.sql
    Assert-Exit 'DB reset'
    mvn.cmd --batch-mode --no-transfer-progress -f src/backend/pom.xml exec:java '-Dexec.mainClass=com.miniongvang.seed.SeedCommand' '-Dexec.args=test' | Select-Object -Last 8
    Assert-Exit 'demo seed'
    docker compose -f docker-compose.ci.yml up --build --wait --wait-timeout 120 backend-test | Select-Object -Last 8
    Assert-Exit 'backend startup'

    foreach ($task in @('smoke', 'smoke:orders', 'smoke:history', 'smoke:cancel', 'smoke:reports', 'smoke:payment', 'smoke:dispatch')) {
        npm.cmd run $task --prefix tools/api | Select-Object -Last 5
        Assert-Exit $task
    }
    docker compose -f docker-compose.ci.yml exec -T db-test /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -b -d mini_ong_vang_test -i /tmp/invariants.sql
    Assert-Exit 'invariants before reset'

    docker compose -f docker-compose.ci.yml stop backend-test | Select-Object -Last 3
    Assert-Exit 'backend stop'
    docker compose -f docker-compose.ci.yml exec -T db-test /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -b -d mini_ong_vang_test -i /tmp/reset.sql
    Assert-Exit 'DB reset before progress'
    mvn.cmd --batch-mode --no-transfer-progress -f src/backend/pom.xml exec:java '-Dexec.mainClass=com.miniongvang.seed.SeedCommand' '-Dexec.args=test' | Select-Object -Last 8
    Assert-Exit 'demo reseed'
    docker compose -f docker-compose.ci.yml up --no-deps --wait --wait-timeout 120 backend-test | Select-Object -Last 5
    Assert-Exit 'backend restart'
    npm.cmd run smoke:progress --prefix tools/api | Select-Object -Last 5
    Assert-Exit 'smoke:progress'
    docker compose -f docker-compose.ci.yml exec -T db-test /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -b -d mini_ong_vang_test -i /tmp/invariants.sql
    Assert-Exit 'invariants after progress'
} catch {
    Write-Error "T20 verification failed: $_"
    exit 1
} finally {
    docker compose -f docker-compose.ci.yml down --volumes --remove-orphans | Select-Object -Last 5
    Remove-Item Env:TEST_DB_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:DEMO_PASSWORD -ErrorAction SilentlyContinue
}
