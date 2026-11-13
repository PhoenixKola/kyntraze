@echo off
rem Rebuild the Kai SOUTH production candidate (Actions, sprite sheets, review media).
rem Needs Python 3.10+ (Pillow, numpy), Blender 5.2, ffmpeg. WORK = throwaway render folder outside the repo.
rem Art regeneration (optional, needs Codex): see source\PROVENANCE.md, then tools\extract.py and tools\pixel_fixes.py.
setlocal
cd /d "%~dp0rig"
if "%BLENDER%"=="" set "BLENDER=F:\Blender\blender-5.2.3-windows-x64\blender.exe"
if "%WORK%"=="" set "WORK=%TEMP%\kai-south-candidate-work"
if not exist "%WORK%" mkdir "%WORK%"
python -c "import anim; anim.export('anim-data.json')" || exit /b 1
"%BLENDER%" -b --python build_blend.py || exit /b 2
python post.py hashes "%WORK%" || exit /b 3
python post.py prep "%WORK%" || exit /b 3
"%BLENDER%" -b kai-south.blend --python export_blend.py -- "%WORK%" || exit /b 4
python post.py final "%WORK%" || exit /b 5
echo DONE
