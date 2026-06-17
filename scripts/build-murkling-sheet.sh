#!/usr/bin/env bash
# Rebuild murkling-sheet.png from source strips in public/assets/murkling/.
# Layout: 8 columns × 2 rows of 32×32 cells (row 0 = walk, row 1 = die).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/public/assets/murkling"
OUT="$DIR/murkling-sheet.png"
TMPDIR="$(mktemp -d)"

CELL=32
COLS=8
WALK_FRAMES=6
DIE_FRAMES=8

cleanup() { rm -rf "$TMPDIR"; }
trap cleanup EXIT

# Walk row (6 frames + 2 empty cells)
for i in $(seq 0 $((WALK_FRAMES - 1))); do
    convert "$DIR/walk.png" -crop "${CELL}x${CELL}+$((i * CELL))+0" +repage \
        "$TMPDIR/row0-$(printf '%02d' "$i").png"
done
for i in $(seq $WALK_FRAMES $((COLS - 1))); do
    convert -size "${CELL}x${CELL}" xc:none "$TMPDIR/row0-$(printf '%02d' "$i").png"
done

# Die row (8 frames)
for i in $(seq 0 $((DIE_FRAMES - 1))); do
    convert "$DIR/die.png" -crop "${CELL}x${CELL}+$((i * CELL))+0" +repage \
        "$TMPDIR/row1-$(printf '%02d' "$i").png"
done

montage \
    $(seq -f "$TMPDIR/row0-%02g.png" 0 $((COLS - 1))) \
    $(seq -f "$TMPDIR/row1-%02g.png" 0 $((DIE_FRAMES - 1))) \
    -tile "${COLS}x2" -geometry "${CELL}x${CELL}+0+0" \
    -background none "$OUT"

identify "$OUT"
