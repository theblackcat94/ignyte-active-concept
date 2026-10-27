#!/usr/bin/env bash
set -euo pipefail
umask 077
runtime=/home/internetremovals/.local/share/ignyte-backup-runtime
export IGNYTE_BACKUP_DIR=/home/internetremovals/.local/share/ignyte-backups
mkdir -p "$IGNYTE_BACKUP_DIR"
cd "$runtime"
exec /home/internetremovals/.local/opt/node-v22.23.4-linux-x64/bin/node \
  --env-file=/home/internetremovals/.config/ignyte/build.env scripts/backup-store.mjs
