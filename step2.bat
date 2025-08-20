@echo off
setlocal

:: Define paths
set "PROJECT_DIR=%~dp0"

:: Backend configs
set "SERVER_TARGET_PATH=%PROJECT_DIR%/scripts/quickrun_backend.bat"
set "SERVER_ICON_PATH=%PROJECT_DIR%/scripts/icon_backend"
set "SERVER_SHORTCUT_NAME=run_this_to_open_server"
set "SERVER_SHORTCUT_PATH=%PROJECT_DIR%%SERVER_SHORTCUT_NAME%.lnk"

:: Frontend configs
set "FRONTEND_TARGET_PATH=%PROJECT_DIR%/scripts/run_frontend.bat"
set "FRONTEND_ICON_PATH=%PROJECT_DIR%/scripts/icon_frontend"
set "FRONTEND_SHORTCUT_NAME=run_this_to_open_frontend"
set "FRONTEND_SHORTCUT_PATH=%PROJECT_DIR%%FRONTEND_SHORTCUT_NAME%.lnk"

:: --- Backend Shortcut ---
if not exist "%SERVER_ICON_PATH%" (
    echo Error: Icon file not created at %SERVER_ICON_PATH%.
    exit /b 1
)

echo Creating backend shortcut...
powershell -command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SERVER_SHORTCUT_PATH%'); $s.TargetPath = '%SERVER_TARGET_PATH%'; $s.IconLocation = '%SERVER_ICON_PATH%'; $s.Save()"

if exist "%SERVER_SHORTCUT_PATH%" (
    echo Backend shortcut created: %SERVER_SHORTCUT_PATH%
) else (
    echo Error: Failed to create backend shortcut.
)

:: --- Frontend Shortcut ---
if not exist "%FRONTEND_ICON_PATH%" (
    echo Error: Icon file not created at %FRONTEND_ICON_PATH%.
    exit /b 1
)

echo Creating frontend shortcut...
powershell -command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%FRONTEND_SHORTCUT_PATH%'); $s.TargetPath = '%FRONTEND_TARGET_PATH%'; $s.IconLocation = '%FRONTEND_ICON_PATH%'; $s.Save()"

if exist "%FRONTEND_SHORTCUT_PATH%" (
    echo Frontend shortcut created: %FRONTEND_SHORTCUT_PATH%
) else (
    echo Error: Failed to create frontend shortcut.
)

endlocal
