@echo off
cd /d "%~dp0"
echo Menlo עולה עכשיו...
echo.
echo אחרי שמופיע Menlo ready, פתח בדפדפן:
echo http://localhost:3001
echo.
"C:\Program Files\nodejs\node.exe" serve-menlo.js
echo.
echo השרת נעצר. אפשר לסגור את החלון.
pause
