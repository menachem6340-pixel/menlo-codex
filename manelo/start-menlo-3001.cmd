@echo off
cd /d "%~dp0"
"C:\Program Files\nodejs\node.exe" node_modules\next\dist\bin\next start --port 3001 >> start-server-3001.out.log 2>> start-server-3001.err.log
