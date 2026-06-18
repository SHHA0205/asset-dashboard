# PowerShell 실행 정책 오류 시: start.bat 을 사용하세요
Set-Location $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  자산 통합 대시보드 실행" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[오류] Node.js가 설치되어 있지 않습니다." -ForegroundColor Red
    Write-Host "https://nodejs.org 에서 LTS 버전을 설치하세요."
    Read-Host "Enter 키를 눌러 종료"
    exit 1
}

if (-not (Test-Path "node_modules")) {
    Write-Host "패키지 설치 중... (최초 1회)" -ForegroundColor Yellow
    npm install
}

Write-Host ""
Write-Host "  브라우저: http://localhost:5173" -ForegroundColor Green
Write-Host "  종료: Ctrl+C" -ForegroundColor Gray
Write-Host ""

Start-Process "http://localhost:5173"
npm run dev