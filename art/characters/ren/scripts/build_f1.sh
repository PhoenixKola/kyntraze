#!/bin/bash
# Rebuild Ren Ascendant (f1) sprite sheets into art/characters/ren/f1/<dir>/sheets: scripts/build_f1.sh [south|north|east|west ...]  (run prepare_f1.py first)
export KAI_PAD_TOP=${KAI_PAD_TOP:-28}; export KAI_FORM=f1
REN="$(cd "$(dirname "$0")/.." && pwd)"; B='F:\Blender\blender-5.2.3-windows-x64\blender.exe'; W="${TEMP:-/tmp}/ren-build-f1"; mkdir -p "$W"
for d in "${@:-south north east west}"; do
  if [ "$d" = south ]; then
    ( export REN_ROOT_SOUTH="$REN/f1/south"; mkdir -p "$W/s" "$REN/f1/south/rig"; cd "$REN/rig" && python -c "import anim; anim.export(r'../f1/south/rig/anim-data.json')" && "$B" -b --python build_blend.py >/dev/null 2>&1 && python post.py hashes "$W/s" && python post.py prep "$W/s" && "$B" -b ../f1/south/rig/ren-south.blend --python export_blend.py -- "$W/s" >/dev/null 2>&1 && python post.py final "$W/s" | grep -E "Traceback|Error|Transform"; echo "south done" )
  else
    ( export KAI_ROOT="$REN/f1"; cd "$REN/rig_dirs" && python build_dir.py $d "$W/$d" | grep -E "Traceback|Error|Transform"; echo "$d done" )
  fi
done
