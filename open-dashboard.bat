@echo off
cd /d "%~dp0"
title Open Dashboard

set "URL=http://localhost:3001"
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"

if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo Starting server...
    start /min "AssetDashboardServer" "%~dp0server-only.bat"
    ping 127.0.0.1 -n 8 >nul
    netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Server did not start. Run start.bat first.
        pause
        exit /b 1
    )
)

:SERVEROK
if not exist "%CHROME%" (
    echo Chrome not found. Opening default browser...
    start "" "%URL%"
    exit /b 0
)

start "" "%CHROME%" --app="%URL%"
exit /b 0