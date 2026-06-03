@echo off
title slingshot-tactician Launcher - HAPPY Games
color 0b

echo ============================================================================
echo.
echo    __  __   ___    ____   ____  __  __     ____    ___    __  ___  ____   ____ 
echo   / / / /  /   ^|  / __ \ / __ \ \ \/ /    / ___^|  /   ^|  /  ^|/  / / ___^| / ___^|
echo  / /_/ /  / /^| ^| / /_/ // /_/ /  \  /    ^| ^|  _  / /^| ^| / /^|_/ /  ^| ^|__  \___ \ 
echo / __  /  / ___ ^|/ ____// ____/   / /     ^| ^|_^| ^|/ ___ ^|/ /  / /   ^| ^|__   ___) ^|
echo /_/ /_/  /_/  ^|_/_/    /_/      /_/       \____/_/  ^|_/_/  /_/    ^|____^| ^|____/ 
echo.
echo                   SLINGSHOT TACTICIAN SYSTEM LAUNCHER
echo.
echo ============================================================================
echo.
echo [1/3] Checking Node.js environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed on this system!
    echo Please download and install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b
)
echo - Node.js is active.

echo.
echo [2/3] Checking project dependencies...
if not exist node_modules (
    echo - node_modules folder is missing. Installing dependencies...
    call npm.cmd install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies. Check your network connection.
        pause
        exit /b
    )
) else (
    echo - Dependencies are active.
)

echo.
echo [3/3] Launching game engine and browser...
start http://localhost:3000/

echo ===================================================
echo     Game server is running at http://localhost:3000/
echo     Do NOT close this window while playing!
echo     Contact: happy_games@vip.qq.com
echo ===================================================
echo.

call npm.cmd run dev

pause
