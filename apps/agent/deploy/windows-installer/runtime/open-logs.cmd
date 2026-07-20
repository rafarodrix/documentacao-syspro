@echo off
set LOGDIR=%ProgramData%\Trilink\Agent\logs
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
explorer "%LOGDIR%"
