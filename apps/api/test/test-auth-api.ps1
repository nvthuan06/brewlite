# BrewLite V2 - HTTP API tests for FR-04 Register, FR-05 Login, JWT.
# Run with NestJS already running and PostgreSQL connected.
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\test\test-auth-api.ps1
#   powershell -ExecutionPolicy Bypass -File .\test\test-auth-api.ps1 -BaseUrl http://localhost:3001
# Creates exactly one new test user on successful registration; does not delete data.
param(
    [string]$BaseUrl = 'http://localhost:3000'
)

$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')
$results = [System.Collections.Generic.List[object]]::new()

function Invoke-Api {
    param(
        [Parameter(Mandatory=$true)][string]$Method,
        [Parameter(Mandatory=$true)][string]$Path,
        [object]$Body = $null,
        [string]$Token = ''
    )
    $args = @{
        Method = $Method
        Uri = "$BaseUrl$Path"
        UseBasicParsing = $true
        ErrorAction = 'Stop'
        Headers = @{}
    }
    if ($Token) { $args.Headers['Authorization'] = "Bearer $Token" }
    if ($null -ne $Body) {
        $args.ContentType = 'application/json'
        $args.Body = ConvertTo-Json -InputObject $Body -Depth 8 -Compress
    }

    $status = 0
    $raw = ''
    try {
        $response = Invoke-WebRequest @args
        $status = [int]$response.StatusCode
        $raw = [string]$response.Content
    } catch {
        if ($null -eq $_.Exception.Response) { throw "Khong ket noi duoc $BaseUrl : $($_.Exception.Message)" }
        $response = $_.Exception.Response
        $status = [int]$response.StatusCode
        if ($response -is [System.Net.HttpWebResponse]) {
            $stream = $response.GetResponseStream()
            if ($null -ne $stream) {
                $reader = [System.IO.StreamReader]::new($stream)
                try { $raw = $reader.ReadToEnd() } finally { $reader.Dispose(); $stream.Dispose() }
            }
        } elseif ($null -ne $_.ErrorDetails -and $_.ErrorDetails.Message) {
            $raw = [string]$_.ErrorDetails.Message
        }
    }
    $data = $null
    if ($raw) {
        try { $data = ConvertFrom-Json -InputObject $raw -ErrorAction Stop }
        catch { $data = $raw }
    }
    return [pscustomobject]@{ Status = $status; Data = $data }
}

function Add-Result {
    param([string]$Name, [string]$Status, [string]$Note = '')
    $results.Add([pscustomobject]@{ Test = $Name; Result = $Status; Note = $Note })
    switch ($Status) {
        'PASS' { Write-Host "[PASS] $Name" -ForegroundColor Green }
        'FAIL' { Write-Host "[FAIL] $Name -- $Note" -ForegroundColor Red }
        default { Write-Host "[SKIP] $Name -- $Note" -ForegroundColor Yellow }
    }
}

function Check-Http {
    param([string]$Name, [int]$Expected, [scriptblock]$Request)
    try {
        $r = & $Request
        if ($r.Status -eq $Expected) { Add-Result $Name 'PASS' "HTTP $($r.Status)" }
        else { Add-Result $Name 'FAIL' "Expected $Expected; got HTTP $($r.Status)" }
        return $r
    } catch {
        Add-Result $Name 'FAIL' $_.Exception.Message
        return $null
    }
}

Write-Host "`n=== BREWLITE V2 - AUTH HTTP TEST ===" -ForegroundColor Cyan
Write-Host "Server: $BaseUrl"
Write-Host 'Scope: Register -> Login -> JWT (NO Products / Orders)'
Write-Host 'Note: A new test user will be created in the connected database.' -ForegroundColor Yellow

$email = "auth.test.$([guid]::NewGuid().ToString('N').Substring(0,12))@example.com"
$password = 'Test123456!'
$registration = @{ email = $email; password = $password }

$r = Check-Http 'TC01 Register valid' 201 { Invoke-Api POST '/auth/register' $registration }
$registered = ($null -ne $r -and $r.Status -eq 201)
if ($registered) {
    $payloadString = ConvertTo-Json -InputObject $r.Data -Depth 8 -Compress
    if ($payloadString -match 'passwordHash|Test123456!') {
        Add-Result 'TC02 Register response hides password' 'FAIL' 'Sensitive value exposed'
    } else {
        Add-Result 'TC02 Register response hides password' 'PASS'
    }
    $null = Check-Http 'TC03 Duplicate email' 409 { Invoke-Api POST '/auth/register' $registration }
} else {
    Add-Result 'TC02 Register response hides password' 'SKIP' 'Registration failed'
    Add-Result 'TC03 Duplicate email' 'SKIP' 'Registration failed'
}

$null = Check-Http 'TC04 Invalid email' 400 { Invoke-Api POST '/auth/register' @{email='not-an-email';password=$password} }
$null = Check-Http 'TC05 Password too short' 400 { Invoke-Api POST '/auth/register' @{email="short.$([guid]::NewGuid().ToString('N').Substring(0,8))@example.com";password='123'} }
$null = Check-Http 'TC06 Missing email' 400 { Invoke-Api POST '/auth/register' @{password=$password} }

$token = ''
if ($registered) {
    $login = Check-Http 'TC07 Login valid' 200 { Invoke-Api POST '/auth/login' $registration }
    if ($null -ne $login -and $login.Status -eq 200) {
        if ($null -ne $login.Data -and $login.Data.access_token -is [string] -and $login.Data.access_token.Length -gt 0) {
            $token = $login.Data.access_token
            Add-Result 'TC08 Login returns access_token' 'PASS'
        } else { Add-Result 'TC08 Login returns access_token' 'FAIL' 'Missing access_token' }
    } else { Add-Result 'TC08 Login returns access_token' 'SKIP' 'Login failed' }
    $null = Check-Http 'TC09 Wrong password' 401 { Invoke-Api POST '/auth/login' @{ email=$email;password='Wrong123456!' } }
} else {
    Add-Result 'TC07 Login valid' 'SKIP' 'Registration failed'
    Add-Result 'TC08 Login returns access_token' 'SKIP' 'Registration failed'
    Add-Result 'TC09 Wrong password' 'SKIP' 'Registration failed'
}

$null = Check-Http 'TC10 Unknown email' 401 { Invoke-Api POST '/auth/login' @{email="absent.$([guid]::NewGuid().ToString('N').Substring(0,12))@example.com";password=$password} }
$null = Check-Http 'TC11 Missing login password' 400 { Invoke-Api POST '/auth/login' @{email=$email} }

# The following tests require the optional GET /auth/profile endpoint protected by JwtAuthGuard.
$null = Check-Http 'TC12 Profile without token' 401 { Invoke-Api GET '/auth/profile' }
$null = Check-Http 'TC13 Profile invalid token' 401 { Invoke-Api GET '/auth/profile' $null 'invalid.jwt.token' }
if ($token) {
    $profile = Check-Http 'TC14 Profile valid token' 200 { Invoke-Api GET '/auth/profile' $null $token }
    if ($null -ne $profile -and $profile.Status -eq 200) {
        if ($null -ne $profile.Data -and $profile.Data.email -eq $email) {
            Add-Result 'TC15 Profile matches logged-in user' 'PASS'
        } else { Add-Result 'TC15 Profile matches logged-in user' 'FAIL' 'Email mismatch' }
    } else { Add-Result 'TC15 Profile matches logged-in user' 'SKIP' 'Profile request failed' }
} else {
    Add-Result 'TC14 Profile valid token' 'SKIP' 'No token'
    Add-Result 'TC15 Profile matches logged-in user' 'SKIP' 'No token'
}

Write-Host "`n=== RESULTS ===" -ForegroundColor Cyan
$results | Format-Table -AutoSize
$pass = @($results | Where-Object Result -eq 'PASS').Count
$fail = @($results | Where-Object Result -eq 'FAIL').Count
$skip = @($results | Where-Object Result -eq 'SKIP').Count
Write-Host "PASS=$pass  FAIL=$fail  SKIP=$skip / $($results.Count)"
Write-Host "Test account email: $email"
Write-Host 'Note: No passwords, access tokens or hashes are displayed.'
if ($fail -gt 0 -or $skip -gt 0) { exit 1 }
exit 0
