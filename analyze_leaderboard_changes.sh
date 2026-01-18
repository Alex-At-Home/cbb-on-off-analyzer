#!/bin/sh
git diff --name-only HEAD public/leaderboards/lineups | while read filename; do
  size_prev=$(git cat-file -s HEAD:"$filename")
  size_curr=$(stat -f%z "$filename")
  
  # avoid divide-by-zero
  if [ "$size_prev" -eq 0 ]; then
    pct="N/A"
  else
    pct=$(printf "%.2f" "$(echo "($size_curr - $size_prev) * 100 / $size_prev" | bc -l)")
  fi

  # ANSI bold for the % change
  bold_start="\033[1m"
  bold_end="\033[0m"

  echo "$filename: $size_prev bytes -> $size_curr bytes ${bold_start}(${pct}%)${bold_end}"
done
