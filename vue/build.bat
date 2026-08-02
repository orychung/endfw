@echo off
setlocal EnableDelayedExpansion

if not exist "build" mkdir "build"

for %%f in (*.xml) do (
    echo Processing %%f ...

    set "ps1=.\xml2js_%RANDOM%.ps1"

    (
        echo $content = Get-Content -LiteralPath '%%~f' -Raw -Encoding UTF8
        echo $escaped = $content -replace "\\","\\\\" -replace "'","\'" -replace "`r`n","\n" -replace "`n","\n" -replace "`r","\n" -replace "`t","\t"
        echo $js = "document.body.insertAdjacentHTML('afterbegin', '$escaped');"
        echo Set-Content -LiteralPath 'build\%%~nf.js' -Value $js -Encoding UTF8 -NoNewline
    ) > "!ps1!"

    powershell -NoProfile -ExecutionPolicy Bypass -File "!ps1!"

    if !errorlevel! equ 0 (
        echo   -^> build\%%~nf.js
    ) else (
        echo   ERROR processing %%f
    )

    del "!ps1!" >nul 2>&1
)

echo.
echo Done.
endlocal
pause
