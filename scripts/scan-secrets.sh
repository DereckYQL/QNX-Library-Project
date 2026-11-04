#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v gitleaks >/dev/null; then
  echo 'Instala Gitleaks 8.30.1 (ver docs/OPERACION.md).' >&2
  exit 1
fi
snapshot="$(node scripts/source-snapshot.js)"
trap 'rm -rf -- "$snapshot"' EXIT
gitleaks dir "$snapshot" --redact=100 --config .gitleaks.toml --no-banner
gitleaks git . --redact=100 --config .gitleaks.toml --log-opts='--all' --no-banner
