@echo off
chcp 65001 > nul
title 태화강 십리대숲 힐링 공간 실행기
echo ==========================================================
echo  태화강 십리대숲 힐링 가상공간을 시작합니다...
echo ==========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_server.ps1"
pause
