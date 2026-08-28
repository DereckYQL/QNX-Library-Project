@echo off
REM QNX Library v2.4 - Acceso directo (segundo plano, sin terminal bloqueada)
title QNX Library v2.4
cd /d "%~dp0"

echo ========================================
echo  QNX Library v2.4 - Modo segundo plano
echo  http://localhost:3000
echo ========================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] Node.js no encontrado. Instala Node 18+ desde https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [INFO] Instalando dependencias...
  call npm install
  if %errorlevel% neq 0 (
    echo [ERROR] npm install fallo
    pause
    exit /b 1
  )
)

if not exist ".env" (
  echo [INFO] Creando .env desde .env.example
  copy ".env.example" ".env" >nul
)

REM Cerrar instancia previa en puerto 3000 si existe
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
  echo [INFO] Cerrando instancia previa PID %%a...
  taskkill /F /PID %%a >nul 2>&1
)

echo [INFO] Iniciando servidor en segundo plano (sin bloquear terminal)...
REM Lanzar node oculto y desacoplado
powershell -NoProfile -Command "Start-Process -FilePath 'node' -ArgumentList 'public\js\server.js' -WorkingDirectory '%cd%' -WindowStyle Hidden"

timeout /t 3 >nul

REM Verificar que responde /api/health
powershell -NoProfile -Command "try { $r=Invoke-RestMethod -Uri 'http://localhost:3000/api/health' -TimeoutSec 5; Write-Host \"[OK] Servidor activo - DB: $($r.db) - Libros: $($r.count)\" -ForegroundColor Green } catch { Write-Host \"[WARN] Aun iniciando... revisa http://localhost:3000/api/health\" -ForegroundColor Yellow }"

echo [INFO] Abriendo navegador...
start "" http://localhost:3000

echo.
echo [OK] Listo. Ya puedes cerrar esta ventana, el sitio seguira abierto.
echo     Para detener el servidor ejecuta "Detener QNX Library v2.4.bat"
echo.
timeout /t 5
exit /b 0
