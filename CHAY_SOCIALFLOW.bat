@echo off
chcp 65001 >nul
title SocialFlow - Auto Reup Social Media Manager
color 0b

:: Chuyen den thu muc chua file bat
cd /d "%~dp0"

echo ====================================================================
echo             SOCIALFLOW - AUTO REUP SOCIAL MEDIA MANAGER             
echo       He thong quan ly & dang video da nen tang tu dong (Reels)     
echo ====================================================================
echo.

:: 1. Kiem tra Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] Khong tim thay Node.js tren may tinh!
    echo Vui long cai dat Node.js tai https://nodejs.org/ de tiep tuc.
    echo.
    pause
    exit /b 1
)

:: 2. Kiem tra pnpm
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo [CANH BAO] Khong tim thay lenh pnpm toan cuc, dang thu chay qua npx...
    set PNPM_CMD=npx pnpm
) else (
    set PNPM_CMD=pnpm
)

:: 3. Kiem tra va giai phong port 3000 & 5173 neu con sot tu phien truoc
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: 4. Kiem tra dich vu PostgreSQL (tu dong bat neu chua chay)
sc query postgresql-x64-18 >nul 2>&1
if %errorlevel% equ 0 (
    echo [*] Dang kiem tra dich vu PostgreSQL...
    net start postgresql-x64-18 >nul 2>&1
)

:: 5. Kiem tra Prisma Client va build cac packages noi bo
echo [*] Dong bo Prisma Client & Database Models...
call %PNPM_CMD% db:generate >nul 2>&1
echo [*] Bien dich cac thu vien noi bo (shared & database)...
call %PNPM_CMD% --filter @socialflow/shared build >nul 2>&1
call %PNPM_CMD% --filter @socialflow/database build >nul 2>&1

:: 6. Tu dong mo trinh duyet sau 4 giay
echo [*] Dang khoi dong Backend API va Giao dien Web Dashboard...
echo [*] Trinh duyet se tu dong mo tai dia chi: http://localhost:5173
echo.
start "" cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:5173"

:: 7. Chay he thong SocialFlow (API + Web song song)
echo ====================================================================
echo  - Backend API:    http://localhost:3000
echo  - Web Dashboard:  http://localhost:5173
echo  - Nhan Ctrl + C hoac dong cua so nay de tat he thong.
echo ====================================================================
echo.

call %PNPM_CMD% dev
if %errorlevel% neq 0 (
    echo.
    echo [THONG BAO] Server da dung.
    pause
)
