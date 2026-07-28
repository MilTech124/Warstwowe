"""Generate role-specific PBR maps for wood-effect sandwich-panel skins.

The source images are project-owned ImageGen assets that represent a printed
coil-coating pattern. The normal and roughness maps intentionally describe a
smooth coated steel sheet, not natural wood relief.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "scripts" / "material-sources"
OUTPUT_ROOT = ROOT / "public" / "materials" / "panel-wood"
MANIFEST_PATH = ROOT / "public" / "materials" / "manifest.json"

QUALITY_SIZES = {"1k": 1024, "2k": 2048}
DECORS = {
    "golden_oak": {
        "source": "sandwich-panel-golden-oak.png",
        "label": "Złoty Dąb",
        "prompt": "Golden Oak factory-printed wood-effect coil coating on smooth galvanized steel.",
    },
    "dark_oak": {
        "source": "sandwich-panel-dark-oak.png",
        "label": "Ciemny Dąb",
        "prompt": "Dark Oak factory-printed wood-effect coil coating on smooth galvanized steel.",
    },
    "bog_oak": {
        "source": "sandwich-panel-grey-wood.png",
        "label": "Szary drewnopodobny",
        "prompt": "Grey Wood factory-printed wood-effect coil coating on smooth galvanized steel.",
    },
}


def mirror_tile(image: Image.Image, size: int) -> Image.Image:
    quarter = ImageOps.fit(
        image.convert("RGB"),
        (size // 2, size // 2),
        method=Image.Resampling.LANCZOS,
    )
    top = Image.new("RGB", (size, size // 2))
    top.paste(quarter, (0, 0))
    top.paste(ImageOps.mirror(quarter), (size // 2, 0))
    result = Image.new("RGB", (size, size))
    result.paste(top, (0, 0))
    result.paste(ImageOps.flip(top), (0, size // 2))
    return result


def micro_surface(size: int, seed: int) -> tuple[Image.Image, Image.Image]:
    random.seed(seed)
    noise = Image.effect_noise((size, size), 8).filter(
        ImageFilter.GaussianBlur(max(0.35, size / 3200)),
    )
    subtle = noise.point(lambda value: max(0, min(255, 128 + round((value - 128) * 0.012))))
    nx = ImageChops.offset(subtle, 1, 0)
    ny = ImageChops.offset(subtle, 0, 1)
    normal = Image.merge("RGB", (nx, ny, Image.new("L", (size, size), 255)))
    roughness = noise.point(lambda value: max(0, min(255, 148 + round((value - 128) * 0.02))))
    return normal, roughness


def save_webp(image: Image.Image, path: Path, quality: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "WEBP", quality=quality, method=6)


def update_manifest() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    panel_finishes = {}
    for finish_id, decor in DECORS.items():
        panel_finishes[finish_id] = {
            "kind": "printed-wood sandwich-panel skin",
            "source": decor["source"],
            "author": "OpenAI ImageGen / project",
            "license": "Project-owned generated asset",
            "referenceProduct": "SteelProfil wood-effect PIR sandwich panel",
            "referenceUrl": "https://www.steelprofil.eu/sklep/plyta-warstwowa-drewnopodobna-okladzina-poliuretan-pir/",
            "transformation": (
                "Mirror-tiled and exported as WebP. Normal and roughness were "
                "generated as smooth polyester-coated steel microstructure."
            ),
            "promptSummary": decor["prompt"],
            "variants": ["1k", "2k"],
            "maps": ["albedo", "normal", "roughness"],
        }
    manifest["panelWoodFinishes"] = panel_finishes
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    for index, (finish_id, decor) in enumerate(DECORS.items()):
        source = Image.open(SOURCE_ROOT / decor["source"]).convert("RGB")
        for quality, size in QUALITY_SIZES.items():
            albedo = mirror_tile(source, size)
            normal, roughness = micro_surface(size, 4100 + index)
            target = OUTPUT_ROOT / finish_id / quality
            save_webp(albedo, target / "albedo.webp", 88)
            save_webp(normal, target / "normal.webp", 80)
            save_webp(roughness, target / "roughness.webp", 80)
            if quality == "2k":
                preview = ImageOps.fit(albedo, (320, 320), method=Image.Resampling.LANCZOS)
                save_webp(preview, target.parent / "preview.webp", 84)
    update_manifest()
    print(f"Generated {len(DECORS)} sandwich-panel wood finishes.")


if __name__ == "__main__":
    main()
