@echo off
rem Chay dev.ps1 khong can doi ExecutionPolicy. Vi du: dev, dev -Migrate, dev -Stop
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" %*
