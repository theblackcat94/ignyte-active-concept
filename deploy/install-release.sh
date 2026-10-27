#!/usr/bin/env bash
# Receives an archive from build-and-deploy.sh via the build machine.
set -euo pipefail
sha="${1:?Pass the exact commit SHA}"
if [[ ! "$sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Invalid commit SHA" >&2
  exit 1
fi
archive="/tmp/ignyte-$sha.tar.gz"
release="/opt/ignyte/releases/$sha"
current="/opt/ignyte/current"
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
ln -sfn "$release" /opt/ignyte/current.next
mv -Tf /opt/ignyte/current.next "$current"
systemctl daemon-reload
systemctl enable ignyte.service >/dev/null
systemctl restart ignyte.service
healthy=false
for attempt in {1..20}; do
  if curl --silent --show-error --fail --max-time 2 http://127.0.0.1:3210/ >/dev/null; then
    healthy=true
    break
  fi
  sleep 1
done
if [[ "$healthy" != true ]]; then
  echo "Ignyte health check failed" >&2
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
