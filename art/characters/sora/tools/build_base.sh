#!/bin/bash
# rebuild Sora base, all four directions (Blender 5.2 + Pillow/numpy)
export BLENDER='F:\Blender\blender-5.2.3-windows-x64\blender.exe'
cd "$(dirname "$0")/.."
W="$TEMP/sora-south-work"; mkdir -p "$W"
( cd south/rig && python -c "import anim; anim.export('anim-data.json')" && "$BLENDER" -b --python build_blend.py | grep -E "BUILD|Error|Traceback"; python post.py prep "$W" | tail -1; "$BLENDER" -b sora-south.blend --python export_blend.py -- "$W" | grep -E "CHECKS|Error|Traceback"; python post.py final "$W" | tail -1; rm -f *.blend1 )
( cd dirs && for d in north east west; do python scripts/build_dir.py $d "$TEMP/sora-$d-work" | tail -1 | cut -c1-120; rm -f $d/rig/*.blend1; done )
echo BUILD_BASE_DONE
