#!/usr/bin/env bash
# Runs scripts/check-area-patches.ts from a scheduled context (see install-weekly-check.sh).
# Prints the checker's output, exits with its status, and forwards a failure to
# ~/.local/bin/notify-telegram when that optional notifier exists.
set -uo pipefail

repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

# cron does not inherit the login shell's PATH; npx usually lives in nvm.
if ! command -v npx >/dev/null 2>&1; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true
fi

out=$(cd "$repo" && npx --yes tsx@4 scripts/check-area-patches.ts 2>&1)
status=$?

printf '%s\n' "$out"

notifier="$HOME/.local/bin/notify-telegram"
if [ "$status" -ne 0 ] && [ -x "$notifier" ]; then
  escaped=${out//&/&amp;}
  escaped=${escaped//</&lt;}
  escaped=${escaped//>/&gt;}
  printf '<b>lowb-ddoaudit area patch check failed</b> (exit %s)\n<pre>%s</pre>' \
    "$status" "$(printf '%s' "$escaped" | tail -n 25)" | "$notifier" || true
fi

printf 'check-area-patches: exit %s\n' "$status"

exit "$status"
