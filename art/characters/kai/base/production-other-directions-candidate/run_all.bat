@echo off
rem Rebuilds config, anim data, .blend, sheets, manifests and review images for all three directions from the committed parts.
rem Usage: run_all.bat [work_dir]    (needs Python with numpy+Pillow, Blender 5.2.3 at %BLENDER% or the default path, ffmpeg on PATH)
setlocal
set WORK=%~1
if "%WORK%"=="" set WORK=%TEMP%\kai-other-dirs-work
for %%D in (east west north) do (
  python "%~dp0scripts\build_dir.py" %%D "%WORK%" || exit /b 1
)
echo Done. Review images: %~dp0{east,west,north}\review
