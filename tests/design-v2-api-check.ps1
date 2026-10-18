param(
    [string]$BaseUrl = 'http://localhost:3001',
    [string]$AdminUsername = 'demo_admin',
    [Parameter(Mandatory = $true)][string]$AdminPassword
)

$ErrorActionPreference = 'Stop'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$csrf = Invoke-RestMethod "$BaseUrl/api/v2/auth/csrf" -WebSession $session
$login = @{ username = $AdminUsername; password = $AdminPassword } | ConvertTo-Json -Compress
$null = Invoke-RestMethod "$BaseUrl/api/v2/auth/login" -Method Post -WebSession $session `
    -Headers @{ 'X-CSRF-Token' = $csrf.token } -ContentType 'application/json' -Body $login

function Post-Policy($body) {
    $token = Invoke-RestMethod "$BaseUrl/api/v2/auth/csrf" -WebSession $session
    Invoke-RestMethod "$BaseUrl/api/v2/policies" -Method Post -WebSession $session `
        -Headers @{ 'X-CSRF-Token' = $token.token } -ContentType 'application/json' `
        -Body ($body | ConvertTo-Json -Depth 8 -Compress)
}

$before = Invoke-RestMethod "$BaseUrl/api/v2/policies" -WebSession $session
$name = 'API check ' + [guid]::NewGuid().ToString('N')
$draft = @{
    hanhDong = 'LUU_NHAP'; loai = 'CUOC'
    duLieu = @{
        ten = $name; hieu_luc_tu = '2030-01-01T00:00:00'; hieu_luc_den = '2030-01-02T00:00:00'
        cuoc_co_ban = 21000; don_gia_km = 5000; km_toi_thieu = 0; km_toi_da = 30
        kg_bao_gom = 1; kg_toi_da = 30; don_gia_kg = 3000
    }
}
$created = $null
$identifier = $null
try {
    $created = Post-Policy $draft
    $identifier = ($created.fares | Where-Object { $_.ten -eq $name } | Select-Object -First 1).ma_bieu_phi
    if (-not $identifier) { throw 'Policy draft creation failed' }
    $draft.ma = $identifier
    $draft.duLieu.cuoc_co_ban = 22000
    $edited = Post-Policy $draft
    $saved = $edited.fares | Where-Object { $_.ma_bieu_phi -eq $identifier }
    if ($saved.cuoc_co_ban -ne '22000') { throw 'Policy draft update failed' }

    $first = Invoke-RestMethod "$BaseUrl/api/v2/orders?trangThai=HOAN_TAT&page=0&size=1" -WebSession $session
    $second = Invoke-RestMethod "$BaseUrl/api/v2/orders?trangThai=HOAN_TAT&page=1&size=1" -WebSession $session
    if ($first.totalElements -ge 2 -and $first.items[0].ma_don -eq $second.items[0].ma_don) {
        throw 'Pagination returned the same order on both pages'
    }
    [pscustomobject]@{
        policyCreate = ($created.fares.Count -eq $before.fares.Count + 1)
        policyEdit = $saved.cuoc_co_ban
        orderTotal = $first.totalElements
        firstPageCount = $first.items.Count
        secondPageCount = $second.items.Count
        distinctPages = ($first.totalElements -lt 2 -or $first.items[0].ma_don -ne $second.items[0].ma_don)
    } | ConvertTo-Json -Compress
} finally {
    if ($identifier) {
        $after = Post-Policy @{ hanhDong = 'XOA_NHAP'; loai = 'CUOC'; ma = $identifier }
        if ($after.fares | Where-Object { $_.ma_bieu_phi -eq $identifier }) {
            throw 'Policy test draft cleanup failed'
        }
    }
}
