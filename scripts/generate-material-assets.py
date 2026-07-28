"""Build project-local PBR texture packs from CC0 and generated source images.

Expected source files are placed in .tmp-material-sources by the documented
download step. Final WebP assets and their provenance manifest are written to
public/materials.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / ".tmp-material-sources"
OUTPUT_ROOT = ROOT / "public" / "materials"

QUALITY_SIZES = {"1k": 1024, "2k": 2048}

WOOD_FINISHES = {
    "golden_oak": ("generated-oak", "#A76B2B", 1.08, 1.02),
    "golden_oak_3d": ("generated-oak", "#8F5420", 1.2, 1.08),
    "natural_oak": ("Wood001", "#A98659", 0.92, 0.96),
    "dark_oak": ("Wood027", "#4C3526", 1.04, 0.91),
    "bog_oak": ("Wood029", "#322A25", 1.08, 0.86),
    "rustic_oak": ("generated-oak", "#7E5636", 1.18, 0.92),
    "walnut": ("Wood027", "#5A3A22", 1.1, 0.93),
    "winchester": ("Wood001", "#7B5A3D", 1.05, 0.96),
    "wenge": ("Wood029", "#2B211D", 1.14, 0.82),
    "mahogany": ("Wood027", "#6A3025", 1.12, 0.9),
    "macore": ("Wood027", "#713B2D", 1.15, 0.91),
    "oregon": ("Wood001", "#A46E3F", 1.04, 1.02),
    "sapeli": ("Wood027", "#704035", 1.16, 0.9),
    "siena_noce": ("Wood029", "#574337", 1.06, 0.88),
    "anteak": ("generated-oak", "#8B5A35", 1.07, 0.98),
    "turner_oak_malt": ("generated-oak", "#B18A5E", 0.96, 1.03),
}

SOURCE_INFO = {
    "Wood001": {
        "title": "Wood 001",
        "author": "ambientCG",
        "license": "CC0 1.0",
        "url": "https://ambientcg.com/view?id=Wood001",
        "transformation": "Color grading, contrast reduction and WebP export for coated steel.",
    },
    "Wood027": {
        "title": "Wood 027",
        "author": "ambientCG",
        "license": "CC0 1.0",
        "url": "https://ambientcg.com/view?id=Wood027",
        "transformation": "Color grading, contrast reduction and WebP export for coated steel.",
    },
    "Wood029": {
        "title": "Wood 029",
        "author": "ambientCG",
        "license": "CC0 1.0",
        "url": "https://ambientcg.com/view?id=Wood029",
        "transformation": "Color grading, contrast reduction and WebP export for coated steel.",
    },
    "generated-oak": {
        "title": "Project oak decor base",
        "author": "OpenAI ImageGen / project",
        "license": "Project-owned generated asset",
        "url": None,
        "transformation": "Mirror-tiled, color graded and combined with CC0 micro-normal data.",
    },
}

IMAGEGEN_PROMPT = (
    "Square perfectly tileable premium oak woodgrain printed on coated steel; "
    "orthographic surface scan, even neutral light, warm natural oak, no planks, "
    "no seams, no text, no watermark."
)

METAL_FAMILIES = {
    "smooth-polyester": {"rough": 132, "variation": 8, "normal": 2},
    "matte-polyester": {"rough": 166, "variation": 17, "normal": 5},
    "metallic": {"rough": 116, "variation": 13, "normal": 4},
    "galvanized": {"rough": 128, "variation": 24, "normal": 8},
    "aluzinc": {"rough": 112, "variation": 19, "normal": 7},
    "brushed-metal": {"rough": 96, "variation": 14, "normal": 6},
}


def hex_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4))


def source_paths(source: str, quality: str) -> tuple[Path, Path, Path]:
    if source == "generated-oak":
        generated = SOURCE_ROOT / "generated-oak.png"
        fallback_root = SOURCE_ROOT / f"Wood001_{quality.upper()}"
        return (
            generated,
            fallback_root / f"Wood001_{quality.upper()}-JPG_NormalGL.jpg",
            fallback_root / f"Wood001_{quality.upper()}-JPG_Roughness.jpg",
        )

    source_root = SOURCE_ROOT / f"{source}_{quality.upper()}"
    prefix = f"{source}_{quality.upper()}-JPG"
    return (
        source_root / f"{prefix}_Color.jpg",
        source_root / f"{prefix}_NormalGL.jpg",
        source_root / f"{prefix}_Roughness.jpg",
    )


def mirror_tile(image: Image.Image, size: int) -> Image.Image:
    image = ImageOps.fit(image.convert("RGB"), (size // 2, size // 2), method=Image.Resampling.LANCZOS)
    top = Image.new("RGB", (size, size // 2))
    top.paste(image, (0, 0))
    top.paste(ImageOps.mirror(image), (size // 2, 0))
    result = Image.new("RGB", (size, size))
    result.paste(top, (0, 0))
    result.paste(ImageOps.flip(top), (0, size // 2))
    return result


def grade_wood(image: Image.Image, target_hex: str, contrast: float, brightness: float) -> Image.Image:
    image = image.convert("RGB")
    target = hex_rgb(target_hex)
    grey = ImageOps.grayscale(image)
    low = tuple(max(0, round(channel * 0.28)) for channel in target)
    high = tuple(min(255, round(channel + (255 - channel) * 0.48)) for channel in target)
    tinted = ImageOps.colorize(grey, low, high)
    image = Image.blend(image, tinted, 0.72)
    image = ImageEnhance.Color(image).enhance(0.82)
    image = ImageEnhance.Contrast(image).enhance(contrast)
    return ImageEnhance.Brightness(image).enhance(brightness)


def save_webp(image: Image.Image, path: Path, quality: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "WEBP", quality=quality, method=6)


def build_wood_assets() -> dict:
    manifest = {}
    for finish_id, (source, tint, contrast, brightness) in WOOD_FINISHES.items():
        for quality, size in QUALITY_SIZES.items():
            color_path, normal_path, roughness_path = source_paths(source, quality)
            missing = [path for path in (color_path, normal_path, roughness_path) if not path.exists()]
            if missing:
                raise FileNotFoundError(f"Missing material sources: {missing}")

            if source == "generated-oak":
                color = mirror_tile(Image.open(color_path).rotate(90, expand=True), size)
            else:
                color = ImageOps.fit(Image.open(color_path).convert("RGB"), (size, size), method=Image.Resampling.LANCZOS)

            color = grade_wood(color, tint, contrast, brightness)
            normal = ImageOps.fit(Image.open(normal_path).convert("RGB"), (size, size), method=Image.Resampling.LANCZOS)
            roughness = ImageOps.fit(Image.open(roughness_path).convert("L"), (size, size), method=Image.Resampling.LANCZOS)
            roughness = ImageEnhance.Contrast(roughness).enhance(0.42)
            roughness = Image.blend(roughness, Image.new("L", roughness.size, 164), 0.55)

            target = OUTPUT_ROOT / "wood" / finish_id / quality
            save_webp(color, target / "albedo.webp", 88)
            save_webp(normal, target / "normal.webp", 82)
            save_webp(roughness, target / "roughness.webp", 82)

            if quality == "2k":
                save_webp(ImageOps.fit(color, (320, 320), method=Image.Resampling.LANCZOS), target.parent / "preview.webp", 84)

        manifest[finish_id] = {
            "kind": "wood",
            "source": source,
            **SOURCE_INFO[source],
            "variants": ["1k", "2k"],
            "maps": ["albedo", "normal", "roughness"],
        }
    return manifest


def noise_map(size: int, seed: int, sigma: float, blur: float = 0.0) -> Image.Image:
    random.seed(seed)
    image = Image.effect_noise((size, size), sigma)
    if blur:
        image = image.filter(ImageFilter.GaussianBlur(blur))
    return image


def normalize_noise(image: Image.Image, amplitude: int, center: int = 128) -> Image.Image:
    return image.point(lambda value: max(0, min(255, center + round((value - 128) * amplitude / 128))))


def build_metal_assets() -> dict:
    manifest = {}
    for family_index, (family, settings) in enumerate(METAL_FAMILIES.items()):
        for quality, size in QUALITY_SIZES.items():
            broad = noise_map(size, 1400 + family_index, 34, max(0.6, size / 1500))
            fine = noise_map(size, 2400 + family_index, 18)
            mixed = Image.blend(broad, fine, 0.34)

            if family == "brushed-metal":
                bands = Image.new("L", (size, size))
                row = Image.new("L", (size, 1))
                for y in range(size):
                    value = 128 + round(17 * ((y % 23) / 22 - 0.5)) + random.randint(-3, 3)
                    row.paste(max(0, min(255, value)), (0, 0, size, 1))
                    bands.paste(row, (0, y))
                mixed = Image.blend(mixed, bands, 0.52)

            rough = normalize_noise(mixed, settings["variation"], settings["rough"])
            nx = normalize_noise(ImageChops.offset(mixed, 1, 0), settings["normal"], 128)
            ny = normalize_noise(ImageChops.offset(mixed, 0, 1), settings["normal"], 128)
            nz = Image.new("L", (size, size), 255)
            normal = Image.merge("RGB", (nx, ny, nz))

            target = OUTPUT_ROOT / "metal" / family / quality
            save_webp(normal, target / "normal.webp", 80)
            save_webp(rough, target / "roughness.webp", 80)

            if family in {"galvanized", "aluzinc", "brushed-metal"} and quality == "2k":
                base_color = {
                    "galvanized": "#AEB8BD",
                    "aluzinc": "#B9C0C2",
                    "brushed-metal": "#9EA4A6",
                }[family]
                target_rgb = hex_rgb(base_color)
                preview = ImageOps.colorize(
                    ImageOps.fit(mixed, (320, 320), method=Image.Resampling.LANCZOS),
                    tuple(round(channel * 0.65) for channel in target_rgb),
                    tuple(min(255, round(channel * 1.2)) for channel in target_rgb),
                )
                save_webp(preview, target.parent / "preview.webp", 82)

        manifest[family] = {
            "kind": "metal-surface-family",
            "source": "Procedural project texture",
            "license": "Project-owned generated asset",
            "variants": ["1k", "2k"],
            "maps": ["normal", "roughness"],
        }
    return manifest


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    wood_manifest = build_wood_assets()
    metal_manifest = build_metal_assets()
    manifest = {
        "schemaVersion": 1,
        "licensePolicy": "Only CC0 sources and project-owned generated assets are included.",
        "imageGenPrompt": IMAGEGEN_PROMPT,
        "sources": SOURCE_INFO,
        "woodFinishes": wood_manifest,
        "metalFamilies": metal_manifest,
    }
    (OUTPUT_ROOT / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Generated {len(wood_manifest)} wood finishes and {len(metal_manifest)} metal families.")


if __name__ == "__main__":
    main()
