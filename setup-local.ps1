$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (!(Test-Path .env)) {
  $bytes = New-Object byte[] 48
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($bytes); $rng.Dispose()
  $secret = [BitConverter]::ToString($bytes).Replace("-", "").ToLowerInvariant()
  Set-Content -Path .env -Value "JWT_SECRET=$secret" -Encoding ASCII
}
if (!(Select-String -Path .env -Pattern "^ADMIN_PASSWORD=" -Quiet)) {
  $adminPassword = [Guid]::NewGuid().ToString("N")
  Add-Content .env "ADMIN_PASSWORD=$adminPassword"
}
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { throw "Docker Compose failed" }
Write-Host "Open http://localhost:8080"
