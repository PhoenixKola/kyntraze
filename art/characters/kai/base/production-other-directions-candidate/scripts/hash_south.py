"""SOUTH lock: snapshot or verify SHA-256 of every locked file (SOUTH candidate + approved references).
  python hash_south.py snapshot <out.json>      python hash_south.py verify <snapshot.json>
Local ignored MP4s are included in the snapshot only if present; verify compares exactly the snapshotted set."""
import hashlib, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
KAI = os.path.abspath(os.path.join(HERE, "..", ".."))            # art/characters/kai/base
LOCKED = [os.path.join(KAI, "production-south-candidate"), os.path.join(KAI, "references")]

def collect():
    out = {}
    for root in LOCKED:
        for d, _, fs in os.walk(root):
            if "__pycache__" in d: continue
            for f in fs:
                p = os.path.join(d, f)
                out[os.path.relpath(p, KAI).replace(os.sep, "/")] = hashlib.sha256(open(p, "rb").read()).hexdigest()
    return out

if __name__ == "__main__":
    mode, path = sys.argv[1], sys.argv[2]
    if mode == "snapshot":
        h = collect(); json.dump(h, open(path, "w"), indent=0); print(len(h), "locked files hashed")
    else:
        before = json.load(open(path)); now = collect()
        changed = [k for k, v in before.items() if now.get(k) != v]; extra = [k for k in now if k not in before]
        print("SOUTH lock:", "UNCHANGED" if not changed and not extra else f"CHANGED {changed[:5]} NEW {extra[:5]}", f"({len(before)} files)")
        sys.exit(0 if not changed else 1)
