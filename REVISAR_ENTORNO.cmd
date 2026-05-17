@echo off
setlocal
cd /d "%~dp0"

echo Revisando entorno local de CurriculaPath...
call npm.cmd run doctor
