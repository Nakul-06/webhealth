@echo off
title Cloud WebHealth - GCP Monitor
echo ================================================================
echo   CLOUD-BASED DEAD LINK DETECTION AND WEBSITE HEALTH MONITOR
echo              Google Cloud Platform Implementation
echo ================================================================
echo Starting backend server and serving web dashboard...
cd /d "%~dp0\backend"
node src/server.js
pause
