@echo Off
set config=%1
if "%config%" == "" (
   set config=debug
)

"C:\Program Files (x86)\Microsoft Visual Studio 11.0\Common7\Tools\VsDevCmd.bat"
.nuget\NuGet.exe restore JabbR.sln -configFile %~dp0\.nuget\NuGet.config -nocache
msbuild %~dp0\Build\Build.proj /p:Configuration="%config%" /v:M /fl /flp:LogFile=msbuild.log;Verbosity=Normal /nr:false