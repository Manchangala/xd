@echo off
setlocal
cd /d "%~dp0"

echo Creando paquete limpio de CurriculaPath...
call npm.cmd run delivery:bundle
