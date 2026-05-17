@echo off
setlocal
cd /d "%~dp0"

echo Preparando demo limpia de CurriculaPath...
call npm.cmd run demo:reset || goto :error
call npm.cmd run demo:pdfs || goto :error

echo.
echo Iniciando frontend y backend...
echo Cuando termine de cargar, abre http://127.0.0.1:5173
echo.
call npm.cmd run dev:stack
goto :eof

:error
echo.
echo No se pudo iniciar la demo. Revisa la salida anterior y vuelve a intentarlo.
exit /b 1
