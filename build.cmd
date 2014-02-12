@echo off

echo ----------------------------------------------------------------------------
echo Building Solution
echo ----------------------------------------------------------------------------

set config=%1
if "%config%" == "" (
   set config=debug
)

@call :GetVSCommonToolsDir
@if "%VS110COMNTOOLS%"=="" goto error_no_VS110COMNTOOLSDIR

@call "%VS110COMNTOOLS%VCVarsQueryRegistry.bat" 32bit No64bit

@if "%FrameworkDir32%"=="" goto error_no_FrameworkDIR32
@if "%FrameworkVersion32%"=="" goto error_no_FrameworkVer32
@if "%Framework35Version%"=="" goto error_no_Framework35Version

@set FrameworkDir=%FrameworkDir32%
@set FrameworkVersion=%FrameworkVersion32%
@set PATH=%FrameworkDir%%Framework35Version%;%PATH%
@set PATH=%FrameworkDir%%FrameworkVersion%;%PATH%

.nuget\NuGet.exe restore "%~dp0Vox.sln" -configFile "%~dp0.nuget\NuGet.config" -nocache
msbuild "%~dp0Build\Build.proj" /p:Configuration="%config%" /v:M /fl /flp:LogFile=msbuild.log;Verbosity=Normal /nr:false

@goto end

@REM -----------------------------------------------------------------------
:GetVSCommonToolsDir
@set VS110COMNTOOLS=
@call :GetVSCommonToolsDirHelper32 HKLM > nul 2>&1
@if errorlevel 1 call :GetVSCommonToolsDirHelper32 HKCU > nul 2>&1
@if errorlevel 1 call :GetVSCommonToolsDirHelper64  HKLM > nul 2>&1
@if errorlevel 1 call :GetVSCommonToolsDirHelper64  HKCU > nul 2>&1
@exit /B 0

:GetVSCommonToolsDirHelper32
@for /F "tokens=1,2*" %%i in ('reg query "%1\SOFTWARE\Microsoft\VisualStudio\SxS\VS7" /v "11.0"') DO (
    @if "%%i"=="11.0" (
        @SET "VS110COMNTOOLS=%%k"
    )
)
@if "%VS110COMNTOOLS%"=="" exit /B 1
@SET "VS110COMNTOOLS=%VS110COMNTOOLS%Common7\Tools\"
@exit /B 0

:GetVSCommonToolsDirHelper64
@for /F "tokens=1,2*" %%i in ('reg query "%1\SOFTWARE\Wow6432Node\Microsoft\VisualStudio\SxS\VS7" /v "11.0"') DO (
    @if "%%i"=="11.0" (
        @SET "VS110COMNTOOLS=%%k"
    )
)
@if "%VS110COMNTOOLS%"=="" exit /B 1
@SET "VS110COMNTOOLS=%VS110COMNTOOLS%Common7\Tools\"
@exit /B 0

@REM -----------------------------------------------------------------------
:error_no_VS110COMNTOOLSDIR
@echo ERROR: Cannot determine the location of the VS Common Tools folder.
@goto end

:error_no_FrameworkDIR32
@echo ERROR: Cannot determine the location of the .NET Framework 32bit installation.
@goto end

:error_no_FrameworkVer32
@echo ERROR: Cannot determine the version of the .NET Framework 32bit installation.
@goto end

:error_no_Framework35Version
@echo ERROR: Cannot determine the .NET Framework 3.5 version.
@goto end

:end

echo ----------------------------------------------------------------------------
echo Installing jshint
echo ----------------------------------------------------------------------------

npm install jshint -g

echo ----------------------------------------------------------------------------
echo Running jshint
echo ----------------------------------------------------------------------------

cd Vox
jshint .
