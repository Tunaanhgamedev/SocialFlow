@echo off
chcp 65001 >nul
title Dung SocialFlow
cd /d "%~dp0"

echo ====================================================================
echo                   DUNG SOCIALFLOW HE THONG
echo ====================================================================
echo.
echo Dang kiem tra va giai phong cong 3000 (Backend API)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo [+] Da dung PID: %%a tren cong 3000
    taskkill /F /PID %%a >nul 2>&1
)

echo Dang kiem tra va giai phong cong 5173 (Web Dashboard)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    echo [+] Da dung PID: %%a tren cong 5173
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [HOAN TAT] Toan bo tien trinh SocialFlow da duoc giai phong!
echo.
pause
