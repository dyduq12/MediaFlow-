@echo off
title Instalacao do Assistente Native Messaging - MediaFlow Pro
echo =======================================================
echo   Instalando Assistente do Modo Power (yt-dlp)...
echo =======================================================
python "%~dp0host_installer.py" %*
echo.
echo =======================================================
echo   Instalacao Concluida! Pressione qualquer tecla para fechar...
echo =======================================================
pause > nul
