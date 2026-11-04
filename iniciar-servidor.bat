@echo off
chcp 65001 >nul
title Sorteador Web - Servidor Local
echo ========================================================
echo   Iniciando o Servidor Local do Sorteador...
echo ========================================================
echo.
cd /d "%~dp0"
start http://127.0.0.1:8000
python server.py
pause
