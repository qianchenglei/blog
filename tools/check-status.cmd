@echo off
rem ============================================================
rem  本地发布状态检查（双击运行即可，无需登录 Cloudflare）
rem  用法：tools\check-status.cmd
rem ============================================================
chcp 65001 >nul
cd /d "%~dp0.."

echo.
echo === 抓取远端（fetch origin）===
git fetch --quiet origin
if errorlevel 1 echo [warn] fetch 失败，可能没网络或凭据问题。

echo.
echo === 当前分支与同步状态 ===
git status -sb
echo.

echo === 与 origin/main 的差距 ===
for /f "usebackq tokens=1,2" %%a in (`git rev-list --left-right --count HEAD...origin/main`) do (
  echo   待推送(领先) = %%a     待拉取(落后) = %%b
)
echo.

echo === 最近 6 条提交 ===
git log --oneline -6
echo.

echo === 未提交的改动 ===
git status -s
echo.

echo === 提示 ===
git status -sb | findstr /r /c:"ahead" >nul
if not errorlevel 1 (
  echo   ^>^> 本地领先远端，记得执行:  git push origin main
) else (
  echo   ^>^> 没有待推送提交。
)

echo.
pause
