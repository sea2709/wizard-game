#!/usr/bin/env bash
# Rebuild wizard-sheet.png from source frames in public/assets/wizard/.
# Layout: 5 columns × 7 rows of 96×76 cells (feet bottom-aligned).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/public/assets/wizard"
OUT="$DIR/wizard-sheet.png"
TMPDIR="$(mktemp -d)"

CELL_W=96
CELL_H=76
IDLE_BODY_HEIGHT=75

cleanup() { rm -rf "$TMPDIR"; }
trap cleanup EXIT

prepare_cell() {
    local src="$1"
    local out="$2"
    convert "$src" -resize "${CELL_W}x${CELL_H}>" \
        -background none -gravity south -extent "${CELL_W}x${CELL_H}" "$out"
}

# Walk/run/jump/hurt/attack are authored smaller than idle; trim padding then scale to idle body height.
prepare_idle_scaled_cell() {
    local src="$1"
    local out="$2"
    convert "$src" -trim +repage \
        -resize "x${IDLE_BODY_HEIGHT}" \
        -resize "${CELL_W}x${IDLE_BODY_HEIGHT}>" \
        -background none -gravity south -extent "${CELL_W}x${CELL_H}" "$out"
}

frames=(
    1_IDLE_{000..004}.png
    2_WALK_{000..004}.png
    3_RUN_{000..004}.png
    4_JUMP_{000..004}.png
    6_HURT_{000..004}.png
    5_ATTACK_000.png 5_ATTACK_002.png 5_ATTACK_004.png 5_ATTACK_005.png 5_ATTACK_006.png
    7_DIE_000.png 7_DIE_003.png 7_DIE_007.png 7_DIE_009.png 7_DIE_014.png
)

i=0
for f in "${frames[@]}"; do
  out="$TMPDIR/$(printf '%02d' "$i").png"
  if [[ "$f" == 1_IDLE_* || "$f" == 7_DIE_* ]]; then
    prepare_cell "$DIR/$f" "$out"
  else
    prepare_idle_scaled_cell "$DIR/$f" "$out"
  fi
  i=$((i + 1))
done

montage "$TMPDIR"/*.png -tile 5x7 -geometry "${CELL_W}x${CELL_H}+0+0" \
    -background none "$OUT"

identify "$OUT"
