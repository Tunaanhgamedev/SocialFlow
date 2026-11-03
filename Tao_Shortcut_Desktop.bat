@echo off
chcp 65001 >nul
title Tao Shortcut SocialFlow tren Desktop
cd /d "%~dp0"

echo ====================================================================
echo        TAO SHORTCUT SOCIALFLOW NGOAI MAN HINH (DESKTOP)
echo ====================================================================
echo.
echo Dang tao loi tat (Shortcut) SocialFlow ra Desktop...

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\create_shortcut.ps1"

echo.
echo Hoan tat! Ban co the kiem tra Desktop va nhap dup vao bieu tuong 'SocialFlow'.
echo.
pause
