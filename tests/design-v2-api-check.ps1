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

$first = Invoke-RestMethod "$BaseUrl/api/v2/orders?trangThai=HOAN_TAT&page=0&size=1" -WebSession $session
$second = Invoke-RestMethod "$BaseUrl/api/v2/orders?trangThai=HOAN_TAT&page=1&size=1" -WebSession $session
if ($first.totalElements -ge 2 -and $first.items[0].ma_don -eq $second.items[0].ma_don) {
    throw 'Pagination returned the same order on both pages'
}
[pscustomobject]@{
    orderTotal = $first.totalElements
    firstPageCount = $first.items.Count
    secondPageCount = $second.items.Count
    distinctPages = ($first.totalElements -lt 2 -or $first.items[0].ma_don -ne $second.items[0].ma_don)
} | ConvertTo-Json -Compress
