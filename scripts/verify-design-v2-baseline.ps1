param([switch]$WithFlyway)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$container = 'ong-vang-baseline-' + [guid]::NewGuid().ToString('N').Substring(0,12)
$previousSaPassword = $env:MSSQL_SA_PASSWORD
$previousSqlPassword = $env:SQLCMDPASSWORD
$previousTestPassword = $env:TEST_DB_PASSWORD
$env:MSSQL_SA_PASSWORD = 'Aa!' + [guid]::NewGuid().ToString('N')
$env:SQLCMDPASSWORD = $env:MSSQL_SA_PASSWORD
$created = $false
function Sql([string]$database, [string[]]$arguments) {
    $result = & docker exec $container /opt/mssql-tools18/bin/sqlcmd -S tcp:127.0.0.1,1433 -U sa -C -I -b -d $database @arguments 2>&1
    if ($LASTEXITCODE -ne 0) { throw ($result -join "`n") }
    return $result
}
try {
    & docker run -d --name $container --label ong-vang-purpose=baseline-verification --network none --env ACCEPT_EULA=Y --env MSSQL_PID=Developer --env MSSQL_SA_PASSWORD --env SQLCMDPASSWORD --mount "type=bind,source=$repo,target=/workspace,readonly" mcr.microsoft.com/mssql/server:2022-latest | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Could not create isolated SQL Server' }
    $created = $true
    $ready = $false
    for ($attempt=0; $attempt -lt 60; $attempt++) {
        $ErrorActionPreference = 'Continue'
        & docker exec $container /opt/mssql-tools18/bin/sqlcmd -S tcp:127.0.0.1,1433 -U sa -C -b -l 2 -Q 'SELECT 1' *> $null
        $probeExit = $LASTEXITCODE
        $ErrorActionPreference = 'Stop'
        if ($probeExit -eq 0) { $ready=$true; break }
        Start-Sleep -Seconds 2
    }
    if (!$ready) { throw 'SQL Server startup timed out' }
    Sql master @('-Q', 'CREATE DATABASE mini_ong_vang_design_v2_demo; CREATE DATABASE mini_ong_vang_design_v2_test; CREATE DATABASE mini_ong_vang_baseline_schema;') | Out-Null
    $migrationRoot = Join-Path $repo 'src/backend/src/main/resources/db/designV2Legacy/sqlserver'
    $migrations = Get-ChildItem "$migrationRoot/schema/*.sql", "$migrationRoot/demo/*.sql" | Sort-Object { [int]($_.Name -replace '^V(\d+)__.*','$1') }
    foreach ($file in $migrations) {
        $relative = $file.FullName.Substring($repo.Length + 1).Replace('\','/')
        Sql mini_ong_vang_design_v2_demo @('-i', "/workspace/$relative") | Out-Null
    }
    Write-Output 'PASS: original V1-V26 SQL scripts executed in version order'
    $activeRoot = Join-Path $repo 'src/backend/src/main/resources/db/designV2/sqlserver'
    foreach ($file in Get-ChildItem "$activeRoot/schema/*.sql", "$activeRoot/demo/*.sql" | Sort-Object { [int]($_.Name -replace '^V(\d+)__.*','$1') }) {
        $path = '/workspace/' + $file.FullName.Substring($repo.Length + 1).Replace('\','/')
        Sql mini_ong_vang_design_v2_test @('-i', $path) | Out-Null
        if ($file.Name -ne 'V9__demo_data.sql') { Sql mini_ong_vang_baseline_schema @('-i', $path) | Out-Null }
    }
    Write-Output 'PASS: consolidated scripts executed with and without demo data'
    Sql mini_ong_vang_design_v2_test @('-i', '/workspace/tests/design-v2-baseline-compare.sql')
    if ($WithFlyway) {
        # These databases exist only in this script's randomly named disposable container.
        Sql master @('-Q', 'DROP DATABASE mini_ong_vang_design_v2_test; DROP DATABASE mini_ong_vang_design_v2_demo; CREATE DATABASE mini_ong_vang_design_v2_test; CREATE DATABASE mini_ong_vang_design_v2_demo;') | Out-Null
        $env:TEST_DB_PASSWORD = $env:MSSQL_SA_PASSWORD
        & docker run --rm --network "container:$container" --env TEST_DB_PASSWORD --env TEST_DB_USER=sa --env 'TEST_DB_URL=jdbc:sqlserver://127.0.0.1:1433;databaseName=mini_ong_vang_design_v2_test;encrypt=true;trustServerCertificate=true' --env DESIGN_V2_DEMO=true --env REQUIRE_TEST_DB=true --env VERIFY_MIGRATION_COMPATIBILITY=true --mount "type=bind,source=$repo/src/backend,target=/source,readonly" --mount "type=bind,source=$env:USERPROFILE/.m2,target=/root/.m2,readonly" maven:3.9-eclipse-temurin-21 sh -c 'mkdir /tmp/build && cp /source/pom.xml /tmp/build/ && cp -r /source/src /tmp/build/ && cd /tmp/build && mvn -o --batch-mode --no-transfer-progress test'
        if ($LASTEXITCODE -ne 0) { throw 'Flyway/backend tests failed' }
        Write-Output 'PASS: real Flyway fresh install, legacy history compatibility, restart and backend tests'
    }
} finally {
    if ($created) { & docker rm -f $container | Out-Null }
    $env:MSSQL_SA_PASSWORD = $previousSaPassword
    $env:SQLCMDPASSWORD = $previousSqlPassword
    $env:TEST_DB_PASSWORD = $previousTestPassword
}

