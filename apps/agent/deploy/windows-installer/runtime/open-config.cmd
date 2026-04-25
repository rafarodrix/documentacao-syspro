@echo off
set CONFIG=%ProgramData%\Trilink\Agent\.env
if not exist "%CONFIG%" (
  if exist "%~dp0..\config\.env" (
    copy "%~dp0..\config\.env" "%CONFIG%" >nul
  ) else if exist "%~dp0..\config\.env.example" (
    copy "%~dp0..\config\.env.example" "%CONFIG%" >nul
  )
)
notepad "%CONFIG%"

