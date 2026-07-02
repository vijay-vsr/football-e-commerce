@echo off
title VeePoo19 Elite Jersey Shop
color 0A
echo.
echo  ==============================================
echo   VeePoo19 ELITE JERSEY SHOP - STARTING...
echo  ==============================================
echo.

:: Check if node_modules exists, if not install
if not exist "node_modules\" (
    echo  Installing packages for first time...
    npm install
    echo.
)

echo  Starting server...
echo  Open your browser at: http://localhost:3000
echo.
echo  Press Ctrl+C to stop the server.
echo  ==============================================
echo.

node server.js

pause
