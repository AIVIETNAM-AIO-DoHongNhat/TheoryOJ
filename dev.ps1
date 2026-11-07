# Chạy toàn bộ môi trường phát triển trên Windows (thay cho Makefile): Postgres trong Docker, rag ở cổng 8001,
# Next.js ở cổng 3000. rag và web mở trong hai cửa sổ riêng để xem log; dịch vụ nào đã chạy thì bỏ qua.
#
#   .\dev.ps1            # khởi động tất cả
#   .\dev.ps1 -Migrate   # chạy thêm npm run db:migrate trước khi mở web
#   .\dev.ps1 -Stop      # tắt web, rag và dừng Postgres
#
# Bị chặn bởi ExecutionPolicy thì chạy dev.cmd với cùng tham số.

param(
  [switch]$Migrate,
  [switch]$Stop
)

# Không dùng "Stop": trên PowerShell 5.1, dòng stderr của lệnh ngoài (docker, npm in tiến trình ra stderr) bị coi là
# lỗi dừng script. Kiểm tra $LASTEXITCODE sau từng bước thay vào đó.
$ErrorActionPreference = "Continue"
$Root = $PSScriptRoot
$Compose = @("compose", "-f", (Join-Path $Root "infra/docker-compose.yml"))
$Python = Join-Path $Root ".venv/Scripts/python.exe"
$Web = Join-Path $Root "apps/web"

function Test-Port([int]$Port) {
  [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Stop-Port([int]$Port, [string]$Name) {
  $ids = (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue).OwningProcess | Sort-Object -Unique
  if (-not $ids) { Write-Host "  $Name không chạy" -ForegroundColor DarkGray; return }
  # Tắt cả cây tiến trình (npm -> node, uvicorn --reload -> tiến trình con).
  foreach ($id in $ids) { taskkill /PID $id /T /F | Out-Null }
  Write-Host "  Đã tắt $Name" -ForegroundColor Green
}

function Start-Window([string]$Title, [string]$Dir, [string]$Command) {
  $cmd = "`$Host.UI.RawUI.WindowTitle = '$Title'; Set-Location -LiteralPath '$Dir'; $Command"
  Start-Process powershell -WorkingDirectory $Dir -ArgumentList "-NoExit", "-NoProfile", "-Command", $cmd | Out-Null
}

if ($Stop) {
  Write-Host "Đang tắt..." -ForegroundColor Cyan
  Stop-Port 3000 "web"
  Stop-Port 8001 "rag"
  & docker @Compose stop db | Out-Null
  Write-Host "  Đã dừng Postgres" -ForegroundColor Green
  return
}

# 1. Postgres + pgvector
Write-Host "[1/3] Postgres (127.0.0.1:5433)" -ForegroundColor Cyan
function Test-Docker { docker info *> $null; $LASTEXITCODE -eq 0 }
if (-not (Test-Docker)) {
  $desktop = Join-Path $env:ProgramFiles "Docker/Docker/Docker Desktop.exe"
  if (-not (Test-Path $desktop)) { throw "Docker chưa chạy và không tìm thấy Docker Desktop. Mở Docker rồi chạy lại." }
  Write-Host "  Docker chưa chạy, đang mở Docker Desktop" -NoNewline -ForegroundColor Yellow
  Start-Process $desktop | Out-Null
  $deadline = (Get-Date).AddMinutes(3)
  while (-not (Test-Docker)) {
    if ((Get-Date) -gt $deadline) { Write-Host ""; throw "Docker Desktop chưa sẵn sàng sau 3 phút. Kiểm tra cửa sổ Docker rồi chạy lại." }
    Write-Host "." -NoNewline -ForegroundColor Yellow
    Start-Sleep -Seconds 3
  }
  Write-Host " sẵn sàng" -ForegroundColor Green
}
& docker @Compose up -d --wait db
if ($LASTEXITCODE -ne 0) { throw "Không khởi động được Postgres." }

# 2. Dịch vụ tìm kiếm
Write-Host "[2/3] rag (http://127.0.0.1:8001)" -ForegroundColor Cyan
if (Test-Port 8001) {
  Write-Host "  Đã chạy sẵn, bỏ qua" -ForegroundColor DarkGray
} elseif (-not (Test-Path $Python)) {
  throw "Chưa có .venv. Xem mục 'Dịch vụ tìm kiếm' trong README để cài."
} else {
  Start-Window "TheoryOJ rag" (Join-Path $Root "services/rag") "& '$Python' -m uvicorn app.main:app --port 8001 --reload"
  Write-Host "  Mở cửa sổ 'TheoryOJ rag' (lần đầu tải mô hình có thể mất vài phút)" -ForegroundColor Green
}

# 3. Next.js
Write-Host "[3/3] web (http://localhost:3000)" -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $Web "node_modules"))) {
  Write-Host "  Chưa có node_modules, chạy npm install..." -ForegroundColor Yellow
  Push-Location $Web; try { npm install } finally { Pop-Location }
}
if ($Migrate) {
  Push-Location $Web; try { npm run db:migrate } finally { Pop-Location }
}
if (Test-Port 3000) {
  Write-Host "  Đã chạy sẵn, bỏ qua" -ForegroundColor DarkGray
} else {
  Start-Window "TheoryOJ web" $Web "npm run dev"
  Write-Host "  Mở cửa sổ 'TheoryOJ web'" -ForegroundColor Green
}

Write-Host ""
Write-Host "Xong. Web: http://localhost:3000  ·  rag: http://127.0.0.1:8001  ·  Tắt: .\dev.ps1 -Stop" -ForegroundColor Cyan
