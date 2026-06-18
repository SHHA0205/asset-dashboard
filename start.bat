@echo off
cd /d "%~dp0"
title Asset Dashboard

echo ========================================
echo   Asset Dashboard
echo ========================================
echo.

set "NODE_EXE=C:\Program Files\nodejs\node.exe"
set "NPM_CMD=C:\Program Files\nodejs\npm.cmd"

if not exist "%NODE_EXE%" (
    set "NODE_EXE=C:\Program Files (x86)\nodejs\node.exe"
    set "NPM_CMD=C:\Program Files (x86)\nodejs\npm.cmd"
)

if not exist "%NODE_EXE%" (
    echo [ERROR] Node.js not found.
    echo Install from https://nodejs.org then restart PC.
    goto END
)

echo Node.js OK

netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Port 3001 in use. Stopping old server...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
    ping 127.0.0.1 -n 2 >nul
)

if not exist "node_modules\" (
    echo [1/3] Installing packages...
    call "%NPM_CMD%" install
    if errorlevel 1 goto FAIL
) else (
    echo [1/3] Packages OK
)

echo [2/3] Building...
call "%NPM_CMD%" run build
if errorlevel 1 goto FAIL

if not exist "dist\index.html" (
    echo [ERROR] dist\index.html not found after build.
    goto FAIL
)
echo [2/3] Build OK

echo [3/3] Starting server...
echo.
echo   URL: http://localhost:3001
echo   Keep this window open.
echo ========================================
echo.

ping 127.0.0.1 -n 3 >nul
start http://localhost:3001

"%NODE_EXE%" server\index.js

echo.
echo Server stopped.
goto END

:FAIL
echo.
echo [ERROR] Failed. See messages above.

:END
echo.
pause