#!/usr/bin/env python3
"""Generate app icon and welcome logo from the polished source artwork."""

from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(
    os.environ.get(
        "LOGO_SOURCE",
        str(ROOT / "assets" / "images" / "logo-source.jpg"),
    )
)
ASSETS = ROOT / "assets" / "images"
ICON_OUT = ASSETS / "icon.png"
LOGO_OUT = ASSETS / "logo.png"
LOGO_SIGNIN_OUT = ASSETS / "logo-signin.png"
IOS_ICON = (
    ROOT
    / "ios"
    / "astroinsights"
    / "Images.xcassets"
    / "AppIcon.appiconset"
    / "App-Icon-1024x1024@1x.png"
)

NAVY = (10, 14, 26, 255)  # #0A0E1A


def load_source() -> Image.Image:
    img = Image.open(SOURCE).convert("RGBA")
    if img.size != (1024, 1024):
        img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    return img


def make_app_icon(source: Image.Image) -> Image.Image:
    """Use the provided square artwork directly for the app icon."""
    return source.convert("RGB")


def emblem_alpha(source: Image.Image) -> Image.Image:
    """Build an alpha mask for the metallic emblem, excluding the background."""
    px = source.load()
    alpha = Image.new("L", source.size, 0)
    apx = alpha.load()

    for y in range(source.height):
        for x in range(source.width):
            r, g, b, _ = px[x, y]
            lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
            max_c = max(r, g, b)
            min_c = min(r, g, b)
            sat = (max_c - min_c) / max(max_c, 1)

            # Background: dark navy / fabric texture with low saturation.
            if lum < 42 and sat < 0.24:
                continue
            if lum < 58 and sat < 0.16:
                continue

            # Subtle backdrop grain.
            if lum < 88 and sat < 0.1:
                continue

            strength = min(255, int((lum - 24) * 2.4 + sat * 90))
            apx[x, y] = max(apx[x, y], strength)

    alpha = alpha.filter(ImageFilter.GaussianBlur(radius=0.6))
    return alpha


def crop_emblem(source: Image.Image) -> Image.Image:
    """Emblem-only crop on a square transparent canvas."""
    alpha = emblem_alpha(source)
    emblem = Image.new("RGBA", source.size, (0, 0, 0, 0))
    emblem.paste(source, mask=alpha)

    bbox = emblem.getbbox()
    if not bbox:
        return emblem

    x0, y0, x1, y1 = bbox
    pad = int((x1 - x0) * 0.08)
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(source.width, x1 + pad)
    y1 = min(source.height, y1 + pad)
    cropped = emblem.crop((x0, y0, x1, y1))

    side = max(cropped.width, cropped.height)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    ox = (side - cropped.width) // 2
    oy = (side - cropped.height) // 2
    canvas.paste(cropped, (ox, oy), cropped)
    return canvas.resize((1024, 1024), Image.Resampling.LANCZOS)


def make_welcome_logo(source: Image.Image) -> Image.Image:
    """Full-color emblem for contexts that support richer branding."""
    return crop_emblem(source)


def make_signin_logo(source: Image.Image) -> Image.Image:
    """White monochrome emblem with a fully transparent background."""
    emblem = crop_emblem(source)
    _, _, _, alpha = emblem.split()
    # Drop starfield haze so only the mark remains visible on dark UI.
    alpha = alpha.point(lambda value: 255 if value > 56 else 0)
    white = Image.new("RGBA", emblem.size, (255, 255, 255, 0))
    white.putalpha(alpha)
    return white


def write_android_icons(icon: Image.Image) -> None:
    sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    base = ROOT / "android" / "app" / "src" / "main" / "res"
    rgb = icon.convert("RGB")
    for folder, size in sizes.items():
        out_dir = base / folder
        out_dir.mkdir(parents=True, exist_ok=True)
        resized = rgb.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(out_dir / "ic_launcher.png", optimize=True)
        resized.save(out_dir / "ic_launcher_round.png", optimize=True)


def main() -> None:
    source = load_source()
    icon = make_app_icon(source)
    logo = make_welcome_logo(source)
    signin_logo = make_signin_logo(source)

    ASSETS.mkdir(parents=True, exist_ok=True)
    icon.save(ICON_OUT, optimize=True)
    logo.save(LOGO_OUT, optimize=True)
    signin_logo.save(LOGO_SIGNIN_OUT, optimize=True)

    IOS_ICON.parent.mkdir(parents=True, exist_ok=True)
    icon.save(IOS_ICON, optimize=True)

    write_android_icons(icon)

    print(f"Wrote {ICON_OUT}")
    print(f"Wrote {LOGO_OUT}")
    print(f"Wrote {LOGO_SIGNIN_OUT}")
    print(f"Wrote {IOS_ICON}")
    print("Updated Android launcher icons")


if __name__ == "__main__":
    main()
