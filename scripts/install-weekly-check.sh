#!/usr/bin/env bash
# Installs (or with --remove, deletes) a user cron job that runs scripts/weekly-area-check.sh
# every Monday. The job is per machine and per user; nothing about it lives in the repo.
#
# Usage: scripts/install-weekly-check.sh [--remove]
set -euo pipefail

repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
job="$repo/scripts/weekly-area-check.sh"
entry="0 11 * * 1 \"$job\" 2>&1 | /usr/bin/logger -t area-patches-check"

current=$(crontab -l 2>/dev/null || true)
kept=$(printf '%s\n' "$current" | grep -vF "$job" | sed '/^$/d' || true)

if [ "${1:-}" = "--remove" ]; then
  printf '%s\n' "$kept" | crontab -
  echo "Removed the weekly area-patch check from the crontab."
  exit 0
fi

{
  [ -n "$kept" ] && printf '%s\n' "$kept"
  printf '%s\n' "$entry"
} | crontab -

echo "Installed: $entry"
echo "Read the output with: journalctl -t area-patches-check"
