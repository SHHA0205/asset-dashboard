@echo off
cd /d "%~dp0"

set "NODE_EXE=C:\Program Files\nodejs\node.exe"
set "NPM_CMD=C:\Program Files\nodejs\npm.cmd"

if not exist "%NODE_EXE%" (
    set "NODE_EXE=C:\Program Files (x86)\nodejs\node.exe"
    set "NPM_CMD=C:\Program Files (x86)\nodejs\npm.cmd"
)

if not exist "dist\index.html" (
    call "%NPM_CMD%" run build
)

"%NODE_EXE%" server\index.js