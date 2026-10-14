@echo off
chcp 65001 > nul
title SIES ELEKTRIK - SUNUCUYU DURDUR
cls
echo ===============================================================================
echo     SIES ELEKTRIK - SUNUCUYU DURDURMA ARACI
echo ===============================================================================
echo.
echo Port 5000 uzerinde calisan SIES sunucusu kapatiliyor...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do (
    taskkill /F /PID %%a >nul 2>nul
)
echo.
echo [✓] SIES sunucusu basariyla durduruldu.
timeout /t 3 > nul
