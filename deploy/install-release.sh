#!/usr/bin/env bash
# Receives an archive from build-and-deploy.sh via the build machine.
set -euo pipefail
sha="${1:?Pass the exact commit SHA}"
if [[ ! "$sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Invalid commit SHA" >&2
  exit 1
fi
archive="/tmp/ignyte-$sha.tar.gz"
env_stage="/tmp/ignyte-env-$sha"
env_target=/etc/ignyte/production.env
env_backup="/etc/ignyte/.production.env.rollback-$sha"
release="/opt/ignyte/releases/$sha"
current="/opt/ignyte/current"
cleanup() { rm -f -- "$env_stage" "$env_backup"; }
trap cleanup EXIT
test -f "$archive"
if tar -tzf "$archive" | grep -Eq '(^/|(^|/)\.\.(/|$)|(^|/)\.env($|\.)|(^|/)[^/]+\.(pem|key)$)'; then
  echo "Unsafe package entry" >&2
  exit 1
fi
if [[ -e "$release" ]]; then
  echo "Release already installed: $sha" >&2
  exit 1
fi

if ! id -u ignyte >/dev/null 2>&1; then
  useradd --system --home /opt/ignyte --shell /usr/sbin/nologin ignyte
fi
install -d -m 0750 -o ignyte -g ignyte /var/lib/ignyte
install -d -m 0755 /opt/ignyte/releases
install -d -m 0750 -o root -g ignyte /etc/ignyte
mkdir "$release"
tar -xzf "$archive" -C "$release"
test "$(cat "$release/revision")" = "$sha"
"$release/node" --version
chown -R ignyte:ignyte "$release"

if [[ ! -f /etc/systemd/system/ignyte.service ]]; then
  cat > /etc/systemd/system/ignyte.service <<'UNIT'
[Unit]
Description=Ignyte Active storefront
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ignyte
Group=ignyte
WorkingDirectory=/opt/ignyte/current
Environment=HOSTNAME=127.0.0.1
Environment=PORT=3210
Environment=NODE_ENV=production
Environment=NEXT_PUBLIC_SITE_URL=https://ignyte.theblackcat94.com
EnvironmentFile=-/etc/ignyte/production.env
ExecStart=/opt/ignyte/current/node /opt/ignyte/current/server.js
Restart=always
RestartSec=5
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
UNIT
fi

previous=""
if [[ -L "$current" ]]; then previous="$(readlink -f "$current")"; fi
synced_env=false
had_env=false
if [[ -f "$env_stage" ]]; then
  if [[ -f "$env_target" ]]; then
    cp -p -- "$env_target" "$env_backup"
    had_env=true
  fi
  install -o root -g ignyte -m 0640 "$env_stage" "$env_target.next"
  mv -Tf "$env_target.next" "$env_target"
  synced_env=true
fi
ln -sfn "$release" /opt/ignyte/current.next
mv -Tf /opt/ignyte/current.next "$current"
systemctl daemon-reload
systemctl enable ignyte.service >/dev/null
healthy=false
if systemctl restart ignyte.service; then
  for attempt in {1..20}; do
    if curl --silent --show-error --fail --max-time 2 http://127.0.0.1:3210/ >/dev/null; then
      healthy=true
      break
    fi
    sleep 1
  done
fi
if [[ "$healthy" != true ]]; then
  echo "Ignyte health check failed" >&2
  if [[ "$synced_env" == true ]]; then
    if [[ "$had_env" == true ]]; then
      mv -Tf "$env_backup" "$env_target"
    else
      rm -f -- "$env_target"
    fi
  fi
  if [[ -n "$previous" && "$previous" == /opt/ignyte/releases/* ]]; then
    ln -sfn "$previous" /opt/ignyte/current.next
    mv -Tf /opt/ignyte/current.next "$current"
    systemctl restart ignyte.service
    echo "Previous release restored" >&2
  else
    systemctl stop ignyte.service
  fi
  exit 1
fi
rm -f -- "$archive"
echo "Ignyte app healthy on 127.0.0.1:3210 at $sha"
