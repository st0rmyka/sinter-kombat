"""Write an uncompressed zip. Usage: store-zip.py <out.zip> <baseDir> <listfile>"""
import sys
import zipfile
from pathlib import Path

out, base, listfile = sys.argv[1:]
base = Path(base)
names = [line.strip() for line in Path(listfile).read_text().splitlines() if line.strip()]
with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_STORED, allowZip64=False) as z:
    for name in names:
        z.write(base / name, name.replace("\\", "/"))
print(f"stored {len(names)} -> {out}")
