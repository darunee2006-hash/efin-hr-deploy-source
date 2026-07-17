@echo off
echo ============================================
echo   Deploying hr-source to Vercel production
echo ============================================
cd /d "%~dp0"

call npx vercel link --yes --project efin-hr-deploy --scope darunee2006-5269s-projects --token vcp_2h2t17qxx6wmH561JbNqhbH5LuSeeTtUO3Qi6V1ZsGQErQN1Xt0LSNCY
if errorlevel 1 (
    echo.
    echo Link step failed. See error above.
    pause
    exit /b 1
)

call npx vercel deploy --prod --yes --token vcp_2h2t17qxx6wmH561JbNqhbH5LuSeeTtUO3Qi6V1ZsGQErQN1Xt0LSNCY --scope darunee2006-5269s-projects
if errorlevel 1 (
    echo.
    echo Deploy step failed. See error above.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Done. Check https://efin-hr-deploy.vercel.app/
echo   Remember to revoke the token afterwards:
echo   https://vercel.com/account/tokens
echo ============================================
pause
