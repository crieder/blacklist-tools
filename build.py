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
assert "strict_max_version" not in gecko, "keine Obergrenze: neue Thunderbird-Versionen würden das Add-on abschalten"
update_file = ROOT / "updates.json"
# Frühere Einträge bleiben stehen, aber ohne Obergrenze: Thunderbird übernimmt bei der
# Update-Prüfung die Kompatibilität derselben Version, so werden alte Installationen
# (z. B. 2.1.7 mit 159.*) nicht mehr von neuen Thunderbird-Versionen abgeschaltet.
previous = []
if update_file.exists():
    previous = json.loads(update_file.read_text(encoding="utf-8"))["addons"][gecko["id"]]["updates"]
entries = [e for e in previous if e["version"] != version]
for e in entries:
    e.get("applications", {}).get("gecko", {}).pop("strict_max_version", None)
entries.append({
    "version": version,
    "update_link": f"https://github.com/crieder/blacklist-tools/releases/download/v{version}/{out.name}",
    "update_hash": "sha256:" + hashlib.sha256(out.read_bytes()).hexdigest(),
    "applications": {"gecko": {"strict_min_version": gecko["strict_min_version"]}},
})
updates = {"addons": {gecko["id"]: {"updates": entries}}}
update_file.write_text(json.dumps(updates, indent=2) + "\n", encoding="utf-8", newline="\n")

print(out)
