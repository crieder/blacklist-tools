"""Prüft, ob alle im Code verwendeten Übersetzungsschlüssel in tools/locales.py stehen."""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import locales  # noqa: E402

PATTERNS = [
    r'\bt\(\s*"(\w+)"',
    r'\bL\(\s*"(\w+)"',
    r'data-i18n(?:-placeholder|-title|-doc-title)?="(\w+)"',
    r'title: "(menu\w+)"',
    r'__MSG_(\w+)__',
    r'\? "(\w+)" : "(\w+)"',  # t(cond ? "a" : "b")
]

used = set()
for path in ROOT.rglob("*"):
    if path.suffix not in (".js", ".html", ".json") or any(p in path.parts for p in ("dist", "_locales", "tools")):
        continue
    text = path.read_text(encoding="utf-8")
    for pat in PATTERNS:
        for m in re.findall(pat, text):
            used.update(x for x in (m if isinstance(m, tuple) else (m,)) if x)

known = set(locales.MESSAGES)
# Treffer des Ternär-Musters, die keine Schlüssel sind, ignorieren
missing = sorted(k for k in used - known if re.match(r"^[a-z]+[A-Z]\w*$", k))
unused = sorted(known - used)
print("missing:", missing)
print("unused:", unused)
sys.exit(1 if missing else 0)
