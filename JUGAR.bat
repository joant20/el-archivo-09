@echo off
title EL ARCHIVO 09 - Iniciando Juego 3D
echo ====================================================
echo   EL ARCHIVO 09 - Terror Psicologico 3D
echo ====================================================
echo.

cd /d "%~dp0"

if not exist ".env" (
  echo [1/3] Creando archivo .env desde .env.example...
  copy ".env.example" ".env" >nul
)

docker info >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker Desktop no esta abierto.
  echo Abre Docker Desktop, espera a que este listo y vuelve a ejecutar JUGAR.bat
  pause
  exit /b 1
)

echo [2/3] Construyendo e iniciando Base de Datos, Backend y Juego 3D...
docker compose up --build -d
if errorlevel 1 (
  echo [ERROR] No se pudieron iniciar los contenedores.
  pause
  exit /b 1
)

echo [3/3] Abriendo EL ARCHIVO 09 en tu navegador (http://localhost:5173)...
start "" "http://localhost:5173"
echo.
echo El juego esta activo en http://localhost:5173
echo Para detenerlo mas tarde sin perder partidas ejecuta: docker compose down
pause
