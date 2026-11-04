@echo off
cd /d "%~dp0"
if not exist "node_modules\vite\package.json" (
  echo 首次运行，正在安装依赖...
  call npm ci
  if errorlevel 1 goto failed
)
call npm run dev
if errorlevel 1 goto failed
exit /b 0
:failed
echo 启动失败，请查看上方错误信息。
pause
exit /b 1
