# B21.8 branding provenance
- Tool: Codex ImageGen via scripts/gen-image.py (audited bridge), reference image public/ui/kit/logo-mark.webp (brass shard + teal crack cues). Per-call logs: concepts/PROVENANCE.md, refine/PROVENANCE.md.
- Concepts (prompts in concepts/*-prompt.txt): A shard (rejected, thin at 16px), B cracked K (chosen), C hex core medallion (rejected, reads as generic badge). Rejected studies: rejected/.
- Refinement: refine/master-prompt.txt -> refine/master.png, copied to master-1024.png (ImageGen output, white background).
- Conversion only (no redrawing): scripts/b21-build-icons.py keys the white background to alpha, crops/centres, resizes, writes public/icons/* and build/icons/icon.ico (16,24,32,48,64,128,256), icon.png (512), icon-1024.png.
- comparison-sheet.png: the three concepts at 16/32/48/64/256 on dark and light.
- Original/AI-art ownership is not commercially cleared (see LICENSE-NOTICES.md).
