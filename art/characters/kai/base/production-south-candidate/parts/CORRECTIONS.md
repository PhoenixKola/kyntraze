# Manual pixel corrections (applied by tools/pixel_fixes.py after tools/extract.py)

- `head.png`: mouth strengthened (4 px #7b5648 line at y=39, x=29-32; #b87950 end pixels at x=28 and x=33; #b87950 lip shade at (30,40),(31,40)). The ImageGen head already drew a mouth, but the native sampling left only a faint 3 px line. All colours are from the approved reference palette.

Everything else in `parts/` is the unmodified output of `tools/extract.py` from the ImageGen sheets in `source/` (palette-mapped to the approved reference palette, one sample per detected pixel-grid cell).
