@echo off
chcp 65001 > nul
title SIES ELEKTRIK - AKILLI SIPARIS YONETIM SISTEMI
cls
echo ===============================================================================
echo     SIES ELEKTRIK - AKILLI SIPARIS YONETIM SISTEMI (YEREL OFIS SUNUCUSU)
echo ===============================================================================
echo.
echo  [1/4] Calisma klasorune geciliyor...
cd /d "%~dp0"

echo  [2/4] Node.js kontrol ediliyor...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [HATA] Node.js bulunamadi! Lutfen https://nodejs.org adresinden kurunuz.
    pause
    exit /b 1
)

echo  [3/4] Ag IP adresi tespit ediliyor...
set "LOCAL_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    if not defined LOCAL_IP (
        set "LOCAL_IP=%%a"
    )
)
if defined LOCAL_IP set "LOCAL_IP=%LOCAL_IP: =%"

echo.
echo ===============================================================================
echo   >>> SIES AKILLI SIPARIS SUNUCUSU BASLATILIYOR!
echo.
echo   * Bu bilgisayardan acmak icin:         http://localhost:5000
if defined LOCAL_IP (
echo   * Sirket ici diger bilgisayarlardan:   http://%LOCAL_IP%:5000
)
echo.
echo   * Bilgi: Bu siyah komut penceresini acik tuttugunuz surece sistem kesintisiz
echo     olarak ofis icinde calismaya devam eder. Kapatmak istediginizde pencereyi
echo     kapatabilir veya SIES_DURDUR.bat dosyasini calistirabilirsiniz.
echo ===============================================================================
echo.
echo  [4/4] Tarayici baslatiliyor...
start http://localhost:5000

node server/server.js
pause
