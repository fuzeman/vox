@echo off

set config=%1
if "%config%" == "" (
   set config=debug
)

@if "%FrameworkDir32%"=="" goto error
@if "%FrameworkVersion32%"=="" goto error
@if "%Framework35Version%"=="" goto error

@set FrameworkDir=%FrameworkDir32%
@set FrameworkVersion=%FrameworkVersion32%
@set PATH=%FrameworkDir%%Framework35Version%;%PATH%
@set PATH=%FrameworkDir%%FrameworkVersion%;%PATH%

.nuget\NuGet.exe restore "%~dp0JabbR.sln" -configFile "%~dp0.nuget\NuGet.config" -nocache
msbuild "%~dp0Build\Build.proj" /p:Configuration="%config%" /v:M /fl /flp:LogFile=msbuild.log;Verbosity=Normal /nr:false

@goto end

:error
echo ERROR: Missing environment variable
@goto end

:end
