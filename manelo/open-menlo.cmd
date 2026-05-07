@echo off
setlocal
set "ROOT=%~dp0"
set "NODE_EXE=C:\Program Files\nodejs\node.exe"

echo Menlo מתחיל לעלות...
echo.

if exist "%NODE_EXE%" (
  start "Menlo Server" /D "%ROOT%" cmd /k ""%NODE_EXE%" serve-menlo.js"
) else (
  start "Menlo Server" /D "%ROOT%" cmd /k "node serve-menlo.js"
)

echo ממתין כמה שניות לשרת...
timeout /t 6 /nobreak >nul

start "" "http://localhost:3001"

echo.
echo אם האתר לא נפתח, ודא שבחלון השחור כתוב:
echo Menlo ready on http://localhost:3001
echo.
pause
