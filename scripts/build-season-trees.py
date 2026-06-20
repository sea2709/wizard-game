#!/usr/bin/env python3
"""Split seasonal tree sheets into uniform 256x256 PNGs."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / 'public/assets/platform/elements'

CANVAS_SIZE = 256
MAX_TREE_WIDTH = 232
MAX_TREE_HEIGHT = 248
WHITE_THRESHOLD = 245
PALETTE_COLORS = 64

SEASON_QUADRANTS = (
    ('spring', 'top-left'),
    ('summer', 'top-right'),
    ('fall', 'bottom-left'),
    ('winter', 'bottom-right'),
)

TREE_SETS = (
    {
        'prefix': 'tree',
        'source': OUT_DIR / 'Gemini_Generated_Image_chrfu0chrfu0chrf.png',
    },
    {
        'prefix': 'tree2',
        'source': OUT_DIR / 'Gemini_Generated_Image_2.png',
    },
)


def remove_white_background(image: Image.Image) -> Image.Image:
    pixels = image.load()
    width, height = image.size

    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if (
                alpha > 0
                and red >= WHITE_THRESHOLD
                and green >= WHITE_THRESHOLD
                and blue >= WHITE_THRESHOLD
            ):
                pixels[x, y] = (0, 0, 0, 0)

    return image


def fit_to_canvas(tree: Image.Image) -> Image.Image:
    bbox = tree.getbbox()

    if bbox is None:
        return Image.new('RGBA', (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))

    tree = tree.crop(bbox)
    scale = min(MAX_TREE_WIDTH / tree.width, MAX_TREE_HEIGHT / tree.height)
    scaled_size = (
        max(1, round(tree.width * scale)),
        max(1, round(tree.height * scale)),
    )
    tree = tree.resize(scaled_size, Image.Resampling.LANCZOS)

    canvas = Image.new('RGBA', (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    paste_x = (CANVAS_SIZE - tree.width) // 2
    paste_y = CANVAS_SIZE - tree.height
    canvas.paste(tree, (paste_x, paste_y), tree)

    return canvas


def optimize_image(image: Image.Image) -> Image.Image:
    quantized = image.quantize(
        colors=PALETTE_COLORS,
        method=Image.Quantize.FASTOCTREE,
        dither=Image.Dither.NONE
    )
    return quantized.convert('RGBA')


def crop_box(source: Image.Image, quadrant: str) -> tuple[int, int, int, int]:
    width, height = source.size
    half_width = width // 2
    half_height = height // 2

    if quadrant == 'top-left':
        return (0, 0, half_width, half_height)
    if quadrant == 'top-right':
        return (half_width, 0, width, half_height)
    if quadrant == 'bottom-left':
        return (0, half_height, half_width, height)

    return (half_width, half_height, width, height)


def save_png(image: Image.Image, path: Path) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format='PNG', optimize=True, compress_level=9)
    return path.stat().st_size


def build_tree_set(prefix: str, source_path: Path) -> None:
    if not source_path.is_file():
        raise FileNotFoundError(f'Missing seasonal tree sheet: {source_path}')

    source = Image.open(source_path).convert('RGBA')

    for season, quadrant in SEASON_QUADRANTS:
        filename = f'{prefix}-{season}.png'
        tree = remove_white_background(source.crop(crop_box(source, quadrant)))
        canvas = fit_to_canvas(tree)
        optimized = optimize_image(canvas)
        byte_size = save_png(optimized, OUT_DIR / filename)
        print(f'{filename}: {optimized.size[0]}x{optimized.size[1]}, {byte_size // 1024} KiB')


def build_season_trees() -> None:
    for tree_set in TREE_SETS:
        if not tree_set['source'].is_file():
            print(f"Skipping {tree_set['prefix']}: missing {tree_set['source'].name}")
            continue

        build_tree_set(tree_set['prefix'], tree_set['source'])


if __name__ == '__main__':
    build_season_trees()
