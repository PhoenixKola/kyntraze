#!/bin/bash
# Rebuild Ren sprite sheets: scripts/build_all.sh [south|north|east|west ...]  (FORM=f1 not supported here; see ART-NOTES)
export KAI_PAD_TOP=${KAI_PAD_TOP:-28}; REN="$(cd "$(dirname "$0")/.." && pwd)"; B='F:\Blender\blender-5.2.3-windows-x64\blender.exe'; W="${TEMP:-/tmp}/ren-build"; mkdir -p "$W"
for d in "${@:-south north east west}"; do
  if [ "$d" = south ]; then
    ( cd "$REN/rig" && python vex_fit.py >/dev/null && python -c "import anim; anim.export(r'../south/rig/anim-data.json')" && "$B" -b --python build_blend.py >/dev/null 2>&1 && mkdir -p "$W/s" && python post.py hashes "$W/s" && python post.py prep "$W/s" && "$B" -b ../south/rig/vex-south.blend --python export_blend.py -- "$W/s" >/dev/null 2>&1 && python post.py final "$W/s" | grep -E "Traceback|Error" ; echo "south done" )
  else
    ( cd "$REN/rig_dirs" && python build_dir.py $d "$W/$d" | grep -E "Traceback|Error"; echo "$d done" )
  fi
done
