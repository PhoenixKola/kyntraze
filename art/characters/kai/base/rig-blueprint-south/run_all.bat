@echo off
rem Rebuild the SOUTH rig blueprint end to end. Needs Python 3.10+ with Pillow+numpy and Blender 5.2.
rem Override Blender with:  set BLENDER=C:\path\to\blender.exe
setlocal
cd /d "%~dp0"
if "%BLENDER%"=="" set "BLENDER=F:\Blender\blender-5.2.3-windows-x64\blender.exe"
python scripts\build_kit.py || exit /b 1
"%BLENDER%" -b --python scripts\blender_build.py || exit /b 2
"%BLENDER%" -b kai-south-rig-pilot.blend --python scripts\blender_verify.py || exit /b 3
python scripts\qa_analyze.py || exit /b 4
python scripts\check_part.py --self-test || exit /b 5
echo DONE
