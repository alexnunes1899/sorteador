@echo off
chcp 65001 >nul
cls
echo ============================================================
echo   SORTEADOR PRO - CONECTAR SESSÃO DO INSTAGRAM
echo ============================================================
echo.
echo Para extrair comentários de publicações e Reels do Instagram
echo diretamente por link, cole abaixo o seu cookie "sessionid".
echo.
echo COMO PEGAR O SESSIONID:
echo 1. Abra o Instagram no seu navegador (onde você já está logado).
echo 2. Pressione a tecla F12.
echo 3. Vá na aba "Application" (ou Armazenamento) -^> "Cookies" -^> instagram.com.
echo 4. Dê duplo clique no valor do cookie chamado "sessionid" e copie (Ctrl+C).
echo.
echo ============================================================
set /p sessionid="Cole aqui o seu sessionid (ou aperte Enter para cancelar): "

if "%sessionid%"=="" (
    echo.
    echo Nenhuma sessão informada. Operação cancelada.
    pause
    exit /b
)

echo %sessionid%> "%~dp0ig_session.txt"

echo.
echo ============================================================
echo [SUCESSO] Cookie sessionid salvo no arquivo ig_session.txt!
echo O servidor local e o site agora conseguem extrair comentários
echo de qualquer post ou Reel automaticamente.
echo ============================================================
echo.
pause
