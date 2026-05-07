@echo off
cd /d "%~dp0"
echo Menlo Server
echo.

netstat -ano | findstr ":3001" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo Menlo is already running on http://localhost:3001
  echo.
  echo Open the browser manually and go to:
  echo http://localhost:3001
  echo.
  pause
  exit /b 0
)

echo Starting server only...
echo Wait until you see:
echo Menlo ready on http://localhost:3001
echo.

if exist "C:\Program Files\nodejs\node.exe" (
  "C:\Program Files\nodejs\node.exe" serve-menlo.js
) else (
  node serve-menlo.js
)

echo.
echo Server stopped.
pause
