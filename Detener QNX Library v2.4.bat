@echo off
REM QNX Library v2.4 - Detener servidor en segundo plano
title Detener QNX Library
cd /d "%~dp0"

echo Deteniendo QNX Library v2.4 (puerto 3000)...
set FOUND=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
  echo [INFO] Matando PID %%a en puerto 3000
  taskkill /F /PID %%a >nul 2>&1
  set FOUND=1
)

REM Fallback: matar todo node que ejecute server.js (por si el puerto no se detecto)
if %FOUND%==0 (
  echo [INFO] Buscando proceso node public\js\server.js...
  for /f "tokens=2 delims=," %%b in ('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH 2^>nul ^| findstr "node"') do (
    echo [WARN] Encontrado node.exe - usa Administrador de tareas para verificar si deseas cerrarlo.
  )
  echo [INFO] No se encontro LISTENING en :3000. Si sigue corriendo, cierralo desde Administrador de tareas.
) else (
  echo [OK] Servidor detenido.
)

timeout /t 3
exit /b 0
