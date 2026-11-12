from PIL import Image, ImageDraw
from pathlib import Path
root=Path('/mnt/data/kyntraze-fracture-rush/public/art/placeholders')
root.mkdir(parents=True,exist_ok=True)
S=2
for direct in ['north','south','east','west']:
 im=Image.new('RGBA',(40,48))
 d=ImageDraw.Draw(im)
 # intentionally synthetic engineering stand-in, not sprite-art approval
 outline='#0b111e'; jacket='#29384f'; jacket2='#3f5570'; amber='#d78b59'; hair='#26313f'; skin='#e0af87'
 # step boots
 d.rectangle((9,40,18,46),fill=outline);d.rectangle((22,40,31,46),fill=outline)
 d.rectangle((11,36,16,44),fill='#66788b');d.rectangle((24,36,29,44),fill='#66788b')
 # pants
 d.rectangle((10,26,18,41),fill=outline);d.rectangle((22,26,30,41),fill=outline)
 d.rectangle((12,27,17,39),fill= '#4c5264');d.rectangle((23,27,28,39),fill='#4c5264')
 # arms
 d.rectangle((4,14,10,31),fill=outline);d.rectangle((30,14,36,31),fill=outline)
 d.rectangle((5,17,9,27),fill=amber);d.rectangle((31,17,35,27),fill=amber)
 d.rectangle((5,28,9,32),fill=skin);d.rectangle((31,28,35,32),fill=skin)
 # torso
 d.rectangle((10,13,30,31),fill=outline);d.polygon([(11,14),(27,14),(29,29),(12,29)],fill=jacket)
 d.polygon([(13,15),(18,15),(27,29),(23,29)],fill=jacket2)
 d.rectangle((12,28,29,31),fill=amber)
 # head and hair
 d.rectangle((11,3,28,18),fill=outline)
 d.rectangle((12,7,27,17),fill=skin if direct!='north' else '#2b3545')
 d.polygon([(10,10),(10,4),(15,5),(18,0),(22,4),(27,3),(31,9),(28,12),(26,7),(23,9),(18,6),(14,11)],fill=hair)
 if direct=='south':
  d.rectangle((15,13,16,14),fill=outline);d.rectangle((24,13,25,14),fill=outline)
 elif direct=='east':
  d.rectangle((24,13,25,14),fill=outline)
 elif direct=='west':
  d.rectangle((14,13,15,14),fill=outline)
 else:
  d.rectangle((12,6,27,13),fill='#233c53')
 d.rectangle((16,32,25,34),fill='#f1b06a')
 im.save(root/f'kai-{direct}.png')
for kind,color,accent in [('pursuer','#a36682','#df9f9c'),('flanker','#5d83ad','#99d0db')]:
 im=Image.new('RGBA',(28,28)); d=ImageDraw.Draw(im)
 d.ellipse((4,3,24,25),fill='#0b1120');d.polygon([(7,7),(20,5),(24,19),(15,24),(5,19)], fill=color)
 d.rectangle((6,4,10,12),fill=accent);d.rectangle((19,5,23,12),fill=accent)
 d.rectangle((10,15,13,17),fill='#fbe8bc');d.rectangle((17,15,20,17),fill='#fbe8bc')
 im.save(root/f'enemy-{kind}.png')
im=Image.new('RGBA',(14,16));d=ImageDraw.Draw(im);d.polygon([(7,0),(13,6),(9,15),(4,15),(0,6)],fill='#183846');d.polygon([(7,1),(12,6),(8,13),(4,13),(2,6)],fill='#7ce0d5');d.polygon([(7,2),(10,6),(7,11),(5,6)],fill='#d4fff5');im.save(root/'xp.png')
