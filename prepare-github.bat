@echo off
cd /d "%~dp0"
title Prepare GitHub Upload

where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git not installed.
    echo Install from https://git-scm.com
    pause
    exit /b 1
)

if not exist ".git" (
    git init
    echo Git initialized.
)

git add .
git status

echo.
echo Next steps:
echo   1. Create repo on https://github.com/new
echo   2. Run these commands:
echo.
echo   git commit -m "Asset dashboard"
echo   git remote add origin https://github.com/YOUR_NAME/asset-dashboard.git
echo   git branch -M main
echo   git push -u origin main
echo.
echo   3. Deploy on https://render.com - see DEPLOY.md
echo.
pause