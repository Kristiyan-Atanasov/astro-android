#!/usr/bin/env python3
"""Generate sign-in logo + App Store / home-screen app icon from welcome artwork."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "images" / "welcome-logo-source.png"
LOGO_SIGNIN_OUT = ROOT / "assets" / "images" / "logo-signin.png"
ICON_OUT = ROOT / "assets" / "images" / "icon.png"
IOS_ICON = (
    ROOT
    / "ios"
    / "astroinsights"
    / "Images.xcassets"
    / "AppIcon.appiconset"
    / "App-Icon-1024x1024@1x.png"
)

NAVY = (10, 14, 26, 255)


def extract_emblem(source: Image.Image) -> Image.Image:
    """Pull out the circular mark only — no card background, no footer text."""
    img = source.convert("RGBA")
    w, h = img.size

    # Crop to the emblem area on the mockup card (text lives below ~83%).
    top = int(h * 0.16)
    bottom = int(h * 0.825)
    region = img.crop((0, top, w, bottom))
    rw, rh = region.size
    px = region.load()

    alpha = Image.new("L", (rw, rh), 0)
    apx = alpha.load()

    for y in range(rh):
        for x in range(rw):
            r, g, b, _ = px[x, y]
            lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
            max_c = max(r, g, b)
            min_c = min(r, g, b)
            sat = (max_c - min_c) / max(max_c, 1)

            if lum < 80:
                continue
            if lum < 120 and sat > 0.32:
                continue

            strength = min(255, int((lum - 58) * 2.1))
            apx[x, y] = max(apx[x, y], strength)

    alpha = alpha.filter(ImageFilter.GaussianBlur(radius=0.35))
    alpha = alpha.point(lambda value: 255 if value > 28 else 0)

    emblem = Image.new("RGBA", (rw, rh), (255, 255, 255, 0))
    emblem.putalpha(alpha)

    bbox = emblem.getbbox()
    if not bbox:
        return emblem

    x0, y0, x1, y1 = bbox
    pad_x = int((x1 - x0) * 0.08)
    pad_y_top = int((y1 - y0) * 0.08)
    pad_y_bottom = int((y1 - y0) * 0.14)
    x0 = max(0, x0 - pad_x)
    y0 = max(0, y0 - pad_y_top)
    x1 = min(rw, x1 + pad_x)
    y1 = min(rh, y1 + pad_y_bottom)
    cropped = emblem.crop((x0, y0, x1, y1))

    side = max(cropped.width, cropped.height)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    fit = int(side * 0.86)
    scale = fit / max(cropped.width, cropped.height)
    scaled = cropped.resize(
        (max(1, int(cropped.width * scale)), max(1, int(cropped.height * scale))),
        Image.Resampling.LANCZOS,
    )
    ox = (side - scaled.width) // 2
    oy = (side - scaled.height) // 2
    canvas.paste(scaled, (ox, oy), scaled)

    return canvas.resize((1024, 1024), Image.Resampling.LANCZOS)


def make_app_icon(emblem: Image.Image, size: int = 1024) -> Image.Image:
    """App Store / home-screen icon: emblem centered on navy square."""
    icon = Image.new("RGBA", (size, size), NAVY)
    target = int(size * 0.74)
    scaled = emblem.resize((target, target), Image.Resampling.LANCZOS)
    x = (size - target) // 2
    y = (size - target) // 2
    icon.alpha_composite(scaled, (x, y))
    return icon.convert("RGB")


def write_android_icons(icon: Image.Image) -> None:
    sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    base = ROOT / "android" / "app" / "src" / "main" / "res"
    for folder, px in sizes.items():
        out_dir = base / folder
        out_dir.mkdir(parents=True, exist_ok=True)
        resized = icon.resize((px, px), Image.Resampling.LANCZOS)
        resized.save(out_dir / "ic_launcher.png", optimize=True)
        resized.save(out_dir / "ic_launcher_round.png", optimize=True)


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Missing source image: {SOURCE}")

    source = Image.open(SOURCE)
    emblem = extract_emblem(source)
    app_icon = make_app_icon(emblem)

    LOGO_SIGNIN_OUT.parent.mkdir(parents=True, exist_ok=True)
    emblem.save(LOGO_SIGNIN_OUT, optimize=True)
    app_icon.save(ICON_OUT, optimize=True)

    IOS_ICON.parent.mkdir(parents=True, exist_ok=True)
    app_icon.save(IOS_ICON, optimize=True)
    write_android_icons(app_icon)

    print(f"Wrote sign-in logo: {LOGO_SIGNIN_OUT}")
    print(f"Wrote app icon:     {ICON_OUT}")
    print(f"Wrote iOS icon:     {IOS_ICON}")
    print("Updated Android launcher icons")


if __name__ == "__main__":
    main()
