"""Erzeugt Store-Screenshots der Add-on-Fenster mit Beispieldaten (englische Oberfläche).

Aufruf: python store/screenshots/make.py
Benötigt Microsoft Edge (headless). Ergebnis: store/screenshots/*.png
"""

import json
import pathlib
import subprocess
import time

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

messages = json.loads((ROOT / "_locales" / "en" / "messages.json").read_text(encoding="utf-8"))
mock = "const MESSAGES = " + json.dumps(messages, ensure_ascii=False) + ";\n" + (HERE / "mock.js").read_text(encoding="utf-8")
(HERE / "_mock.gen.js").write_text(mock, encoding="utf-8")

# Seite, Query, Fenstergröße, Zusatzskript nach ispconfig.js
SHOTS = {
    "4-blacklist-dialog": ("dialog/dialog.html", "mode=blacklist&messageId=1", (560, 395), ""),
    "5-blacklist-window": ("manage/manage.html", "messageId=1", (680, 765), """
IspConfig.listBlacklist = async () => sampleBlacklist();
"""),
}

for name, (page, query, (w, h), patch) in SHOTS.items():
    src = (ROOT / page).read_text(encoding="utf-8")
    rel = "../../" + page.rsplit("/", 1)[0] + "/"
    src = src.replace('href="../lib/', 'href="../../lib/').replace('href="manage.css"', f'href="{rel}manage.css"')
    src = src.replace('<script src="../lib/common.js"></script>', '<script src="_mock.gen.js"></script>\n  <script src="../../lib/common.js"></script>')
    src = src.replace('<script src="../lib/ispconfig.js"></script>', '<script src="../../lib/ispconfig.js"></script>' + (f"\n  <script>{patch}</script>" if patch else ""))
    script = page.rsplit("/", 1)[1].replace(".html", ".js")
    src = src.replace(f'<script src="{script}"></script>', f'<script src="{rel}{script}"></script>')
    # Thunderbird nutzt unter Windows die Systemschrift Segoe UI
    src = src.replace("</head>", "  <style>body { font-family: 'Segoe UI', sans-serif; }</style>\n</head>")
    harness = HERE / f"_{name}.html"
    harness.write_text(src, encoding="utf-8")
    out = HERE / f"{name}.png"
    url = harness.as_uri() + "?" + query
    subprocess.run([
        EDGE, "--headless=new", f"--user-data-dir={HERE / ('_edge-' + name)}", "--no-first-run", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
        "--force-device-scale-factor=2", f"--window-size={w},{h}", "--virtual-time-budget=3000",
        f"--screenshot={out}", url,
    ], check=True, capture_output=True)
    print(out)
    time.sleep(2)  # Edge-Prozess vollständig beenden lassen
