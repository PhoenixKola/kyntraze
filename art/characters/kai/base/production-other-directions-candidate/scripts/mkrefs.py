"""Build the magnified reference attachments used in ImageGen prompts (written to ../refs/, regenerable)."""
import json, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(os.path.dirname(HERE), "refs"); os.makedirs(OUT, exist_ok=True)
KAI = os.path.abspath(os.path.join(HERE, "..", ".."))
SOUTH = os.path.join(KAI, "production-south-candidate")

def on_magenta(im, k):
    c = Image.new("RGBA", im.size, (255, 0, 255, 255)); c.alpha_composite(im)
    return c.convert("RGB").resize((im.width * k, im.height * k), Image.NEAREST)

ref = Image.open(os.path.join(KAI, "references", "kai-160-native-approved-reference.png")).convert("RGBA")
on_magenta(ref, 6).save(os.path.join(OUT, "approved-6x.png"))
m = json.load(open(os.path.join(SOUTH, "sheets", "manifest.json"))); W, H = m["frame_width"], m["frame_height"]
sheet = Image.open(os.path.join(SOUTH, m["animations"]["Idle"]["sheet"])).convert("RGBA")
idle0 = sheet.crop((0, 0, W, H)); bb = idle0.getbbox(); idle0 = idle0.crop(bb)
on_magenta(idle0, 6).save(os.path.join(OUT, "south-idle-6x.png"))
# SOUTH punch impact for the arm-extension idea
punch = Image.open(os.path.join(SOUTH, m["animations"]["BasicPunch"]["sheet"])).convert("RGBA").crop((5 * W, 0, 6 * W, H)); punch = punch.crop(punch.getbbox())
on_magenta(punch, 6).save(os.path.join(OUT, "south-punch-6x.png"))
print({f: Image.open(os.path.join(OUT, f)).size for f in os.listdir(OUT)})
