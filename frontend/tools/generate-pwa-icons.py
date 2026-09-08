"""Genera iconos PWA (y favicon) desde src/assets/images/logo.png — fuente del favicon original."""
from pathlib import Path

from PIL import Image

ROOT = Path(r"c:\Proyectos\AppFabric\MedicalCore\frontend")
SRC = ROOT / "src" / "assets" / "images" / "logo.png"
OUT_DIR = ROOT / "public"
# Misma base que el favicon/logo-dark: cruz sobre negro.
BG = (0, 0, 0)


def load_mark() -> Image.Image:
    if not SRC.is_file():
        raise FileNotFoundError(f"No está el logo fuente: {SRC}")
    src = Image.open(SRC).convert("RGBA")
    # Fondo negro full-bleed (el PNG trae alpha; el instalador no maneja bien transparencia).
    canvas = Image.new("RGBA", src.size, (*BG, 255))
    canvas.alpha_composite(src)
    return canvas.convert("RGB")


def export_png(size: int, path: Path, src: Image.Image) -> None:
    mark = src.resize((size, size), Image.Resampling.LANCZOS)
    mark.save(path, "PNG", optimize=True)
    print(f"wrote {path} ({path.stat().st_size} bytes)")


def export_favicon(src: Image.Image, path: Path) -> None:
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    icons = [src.resize(s, Image.Resampling.LANCZOS) for s in sizes]
    # Pillow: imagen principal + append_images para multi-resolución.
    icons[-1].save(
        path,
        format="ICO",
        sizes=[(i.width, i.height) for i in icons],
        append_images=icons[:-1],
    )
    print(f"wrote {path} ({path.stat().st_size} bytes)")


def main() -> None:
    src = load_mark()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    export_png(192, OUT_DIR / "pwa-192.png", src)
    export_png(512, OUT_DIR / "pwa-512.png", src)
    export_favicon(src, OUT_DIR / "favicon.ico")


if __name__ == "__main__":
    main()
