@echo off
setlocal
cd /d "%~dp0"

echo Verificando que CurriculaPath este listo para entregar...
call npm.cmd run delivery:verify
