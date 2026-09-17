#!/usr/bin/env bash
# Derive web-sized media from the master files in public/eon.
# Requires ffmpeg (with libwebp + libx264). Idempotent: skips outputs that already exist.
#
#   public/eon/STEAMS-music/*.wav  -> public/eon/audio/<stem>.m4a      (AAC 112k, ~3 MB each; masters are 41 MB)
#   public/eon/eon_scene_*.png     -> public/eon/thumbs/<name>.webp    (320 px, timeline strip / cards)
#   public/eon/asset_*.png         -> public/eon/thumbs/<name>.webp
#   public/eon/*.png               -> public/eon/web/<name>.webp       (1280 px, backgrounds / hero / detail)
#   public/eon/eon_*.mp4           -> public/eon/mobile/eon_*.mp4      (720p, ~1 MB each instead of ~10 MB)
#
# Usage: bash scripts/media.sh [--force]
set -euo pipefail
cd "$(dirname "$0")/.."
FORCE="${1:-}"
EON=public/eon
mkdir -p "$EON/audio" "$EON/thumbs" "$EON/web" "$EON/mobile"

need() { [[ "$FORCE" == "--force" || ! -s "$1" ]]; }

echo "== audio stems"
declare -A STEM=( ["0 Lead Vocals"]=lead_vocals ["1 Backing Vocals"]=backing_vocals ["2 Drums"]=drums ["3 Bass"]=bass ["4 Guitar"]=guitar ["5 Keyboard"]=keyboard ["6 Percussion"]=percussion ["7 Synth"]=synth ["8 Other"]=other )
for src in "${!STEM[@]}"; do
  in="$EON/STEAMS-music/$src.wav"; out="$EON/audio/${STEM[$src]}.m4a"
  [[ -f "$in" ]] || { echo "  missing $in (skip)"; continue; }
  need "$out" && ffmpeg -y -loglevel error -i "$in" -c:a aac -b:a 112k -movflags +faststart "$out" && echo "  $out"
done

echo "== thumbnails (320px webp)"
for in in "$EON"/eon_scene_*.png "$EON"/asset_*.png; do
  [[ -f "$in" ]] || continue
  name=$(basename "${in%.png}"); out="$EON/thumbs/$name.webp"
  need "$out" && ffmpeg -y -loglevel error -i "$in" -vf "scale=320:-2" -c:v libwebp -quality 74 "$out" && echo "  $out"
done

echo "== web images (1280px webp)"
for in in "$EON"/eon_scene_*.png "$EON"/asset_*.png; do
  [[ -f "$in" ]] || continue
  name=$(basename "${in%.png}"); out="$EON/web/$name.webp"
  need "$out" && ffmpeg -y -loglevel error -i "$in" -vf "scale='min(1280,iw)':-2" -c:v libwebp -quality 80 "$out" && echo "  $out"
done

echo "== mobile clips (720p h264)"
for in in "$EON"/eon_[0-9][0-9][0-9].mp4; do
  [[ -f "$in" ]] || continue
  name=$(basename "$in"); out="$EON/mobile/$name"
  need "$out" && ffmpeg -y -loglevel error -i "$in" -vf "scale=-2:720" -c:v libx264 -preset fast -crf 27 -pix_fmt yuv420p -movflags +faststart -an "$out" && echo "  $out"
done

echo "== done"
du -sh "$EON/audio" "$EON/thumbs" "$EON/web" "$EON/mobile" 2>/dev/null || true
