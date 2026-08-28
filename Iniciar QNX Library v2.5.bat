@echo off
REM QNX Library v2.5 - SQLite - Acceso directo (segundo plano, sin terminal bloqueada)
REM Al cerrar esta ventana el localhost SIGUE activo hasta reiniciar Windows o matar node.exe
title QNX Library v2.5
cd /d "%~dp0"

echo ========================================
echo  QNX Library v2.5 - SQLite
echo  http://localhost:3000
echo  DB: public\database\biblioteca.db (DB Browser SQLite)
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

REM Cerrar instancia previa en puerto 3000 si existe (para evitar duplicado)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
  echo [INFO] Reiniciando instancia previa PID %%a...
  taskkill /F /PID %%a >nul 2>&1
  timeout /t 1 >nul
)

echo [INFO] Iniciando servidor en segundo plano (oculto)...
REM Lanzar node desacoplado - WindowStyle Hidden => cerrar esta terminal NO mata el servidor
powershell -NoProfile -Command "Start-Process -FilePath 'node' -ArgumentList 'public\js\server.js' -WorkingDirectory '%cd%' -WindowStyle Hidden"

timeout /t 4 >nul

REM Verificar health
powershell -NoProfile -Command "try { $r=Invoke-RestMethod -Uri 'http://localhost:3000/api/health' -TimeoutSec 5; Write-Host \"[OK] Servidor activo - DB: $($r.db) - Libros: $($r.count) - Usuarios: $($r.usuarios)\" -ForegroundColor Green; Write-Host \"     Admin: admin@qnx.local / Admin123!  |  Visitante: visitante@qnx.local / visitante123\" -ForegroundColor Cyan } catch { Write-Host \"[WARN] Aun iniciando... abre http://localhost:3000/api/health en unos segundos\" -ForegroundColor Yellow }"

echo [INFO] Abriendo navegador...
start "" http://localhost:3000

echo.
echo [OK] Listo. Esta ventana se cerrara sola. El sitio seguira abierto aunque la cierres.
echo     El servidor queda en segundo plano (node.exe oculto).
echo     Se cierra solo al apagar/reiniciar Windows o desde Administrador de tareas ^> node.exe.
echo.
timeout /t 6
exit /b 0
