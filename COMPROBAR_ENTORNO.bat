@echo off
setlocal
echo ================================================
echo LA PAZ SEGURA - COMPROBACION DEL ENTORNO WINDOWS
echo ================================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo [FALTA] Node.js no se encuentra en PATH.
  echo Instala Node.js LTS desde https://nodejs.org/en/download
) else (
  echo [OK] Node.js:
  node --version
)
echo.
where npm >nul 2>nul
if errorlevel 1 (
  echo [FALTA] npm no se encuentra en PATH. Vuelve a instalar Node.js LTS.
) else (
  echo [OK] npm:
  npm --version
)
echo.
where git >nul 2>nul
if errorlevel 1 (
  echo [FALTA] Git no se encuentra en PATH.
  echo Instala Git para Windows desde https://git-scm.com/download/win
) else (
  echo [OK] Git:
  git --version
)
echo.
echo Recomendado: Node.js 24 LTS. Para Vite 8, usa Node 22.12 o posterior.
echo Si acabas de instalar un programa, cierra y vuelve a abrir la terminal.
echo.
pause
endlocal
