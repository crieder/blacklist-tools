"""Packt das Add-on als .xpi nach dist/ (ZIP mit Vorwärts-Schrägstrichen)."""

import hashlib
import json
import pathlib
import subprocess
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent
INCLUDE = ["manifest.json", "_locales", "background.js", "api", "content", "dialog", "icons", "lib", "manage", "options"]

# Sprachdateien aus tools/locales.py erzeugen und Schlüssel prüfen
subprocess.run([sys.executable, str(ROOT / "tools" / "locales.py")], check=True)
subprocess.run([sys.executable, str(ROOT / "tools" / "check_i18n.py")], check=True)

manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
out = ROOT / "dist" / f"blacklist-tools-{manifest['version']}.xpi"
out.parent.mkdir(exist_ok=True)

with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for entry in INCLUDE:
        path = ROOT / entry
        files = [path] if path.is_file() else sorted(p for p in path.rglob("*") if p.is_file())
        for f in files:
            z.write(f, f.relative_to(ROOT).as_posix())

# Update-Manifest für die Selbstverteilung über GitHub (manifest → update_url).
# Verweist auf das versionierte Release-Asset; nach dem Build committen.
gecko = manifest["browser_specific_settings"]["gecko"]
version = manifest["version"]
updates = {
    "addons": {
        gecko["id"]: {
            "updates": [
                {
                    "version": version,
                    "update_link": f"https://github.com/crieder/blacklist-tools/releases/download/v{version}/{out.name}",
                    "update_hash": "sha256:" + hashlib.sha256(out.read_bytes()).hexdigest(),
                    "applications": {
                        "gecko": {k: gecko[k] for k in ("strict_min_version", "strict_max_version") if k in gecko}
                    },
                }
            ]
        }
    }
}
(ROOT / "updates.json").write_text(json.dumps(updates, indent=2) + "\n", encoding="utf-8", newline="\n")

print(out)
