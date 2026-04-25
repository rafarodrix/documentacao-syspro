@echo off
set LOGDIR=%ProgramData%\Trilink\Agent\runtime-state\logs
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
explorer "%LOGDIR%"
