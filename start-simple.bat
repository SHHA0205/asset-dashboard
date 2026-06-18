@echo off
cd /d "%~dp0"
title Asset Dashboard Simple

set "NODE=C:\Program Files\nodejs\node.exe"
set "NPM=C:\Program Files\nodejs\npm.cmd"

if not exist "%NODE%" (
    echo Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules\" call "%NPM%" install
if not exist "dist\index.html" call "%NPM%" run build

echo Open http://localhost:3001
start http://localhost:3001
"%NODE%" server\index.js
pause