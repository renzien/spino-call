@echo off
title Spinosaurus Calling 3D
where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js belum terpasang.
  echo Unduh Node.js terlebih dahulu dari https://nodejs.org/
  pause
  exit /b 1
)

echo Menyiapkan website...
call npm install
if errorlevel 1 (
  echo Gagal memasang kebutuhan website.
  pause
  exit /b 1
)

echo.
echo Website akan dibuka melalui alamat yang muncul di bawah ini.
call npm run dev -- --host 127.0.0.1
pause
