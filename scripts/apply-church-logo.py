#!/usr/bin/env python3
"""Fetch the church logo already configured on the public website and use it for app icons."""
import io
import json
import os
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
supabase_url = os.environ.get("VITE_SUPABASE_URL", "").rstrip("/")
anon_key = os.environ.get("VITE_SUPABASE_ANON_KEY", "")
if not supabase_url or not anon_key:
    raise SystemExit("Supabase public URL/key missing; cannot retrieve the website logo.")

request = urllib.request.Request(
    supabase_url + "/rest/v1/church_settings?key=eq.logo_url&select=value",
    headers={"apikey": anon_key, "Authorization": "Bearer " + anon_key, "Accept": "application/json"},
)
with urllib.request.urlopen(request, timeout=30) as response:
    rows = json.loads(response.read().decode("utf-8"))
if not rows:
    raise SystemExit("No public church logo setting (logo_url) was found.")
value = rows[0].get("value")
logo_url = value if isinstance(value, str) else (value or {}).get("url")
if not logo_url:
    raise SystemExit("The church logo setting does not contain an image URL.")

image_request = urllib.request.Request(logo_url, headers={"User-Agent": "TRPH-App-Icon-Builder/1.0"})
with urllib.request.urlopen(image_request, timeout=30) as response:
    source = Image.open(io.BytesIO(response.read())).convert("RGBA")
if source.width == 0 or source.height == 0:
    raise SystemExit("The saved church logo image is empty.")

BLUE = (16, 43, 103, 255)

def fit_logo(size, padding=0.12):
    canvas = Image.new("RGBA", (size, size), BLUE)
    logo = source.copy()
    max_side = int(size * (1 - 2 * padding))
    logo.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    canvas.alpha_composite(logo, ((size - logo.width) // 2, (size - logo.height) // 2))
    return canvas

fit_logo(192).save(root / "trph-icon-192.png", optimize=True)
fit_logo(512).save(root / "trph-icon-512.png", optimize=True)

android_res = root / "android/app/src/main/res"
if android_res.exists():
    density_sizes = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    foreground_sizes = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
    for density, size in density_sizes.items():
        folder = android_res / ("mipmap-" + density)
        folder.mkdir(parents=True, exist_ok=True)
        icon = fit_logo(size)
        icon.save(folder / "ic_launcher.png", optimize=True)
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
        round_icon = icon.copy()
        round_icon.putalpha(mask)
        round_icon.save(folder / "ic_launcher_round.png", optimize=True)
    for density, size in foreground_sizes.items():
        folder = android_res / ("mipmap-" + density)
        folder.mkdir(parents=True, exist_ok=True)
        foreground = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        logo = source.copy()
        max_side = int(size * 0.64)
        logo.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        foreground.alpha_composite(logo, ((size - logo.width) // 2, (size - logo.height) // 2))
        foreground.save(folder / "ic_launcher_foreground.png", optimize=True)
    adaptive = android_res / "mipmap-anydpi-v26"
    adaptive.mkdir(parents=True, exist_ok=True)
    xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
'''
    (adaptive / "ic_launcher.xml").write_text(xml, encoding="utf-8")
    (adaptive / "ic_launcher_round.xml").write_text(xml, encoding="utf-8")
    values = android_res / "values"
    values.mkdir(parents=True, exist_ok=True)
    (values / "ic_launcher_background.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="ic_launcher_background">#102B67</color></resources>\n',
        encoding="utf-8",
    )

print("Applied the church website logo to PWA icons" + (" and Android launcher icons." if android_res.exists() else "."))
