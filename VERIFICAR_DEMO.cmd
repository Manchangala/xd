@echo off
setlocal
cd /d "%~dp0"

echo Verificando estado de la demo...
call npm.cmd run demo:check
