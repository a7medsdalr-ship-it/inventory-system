@echo off
title تشغيل نظام إدارة المخازن والمخزون
echo ========================================================
echo جاري تشغيل سيرفر نظام المخازن والرابط السحابي...
echo ========================================================
start "" /b python server.py
start "" .\cloudflared.exe tunnel --url http://localhost:8080 --edge-ip-version 4
echo تم التشغيل بنجاح!
pause
