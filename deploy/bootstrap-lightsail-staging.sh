#!/usr/bin/env bash
# Run as root on the dedicated Lightsail staging instance after app deployment.
# The Lightsail firewall remains closed to web traffic until DNS and HTTPS are ready.
set -euo pipefail

domain=dev.ignyteactive.com
source_conf=/tmp/ignyte-staging.nginx.conf
site="/etc/nginx/sites-available/$domain"
enabled="/etc/nginx/sites-enabled/$domain"

test -f /opt/ignyte/current/revision
test -f "$source_conf"
if [[ -e "$site" || -e "$enabled" || -L "$enabled" ]]; then
  echo "Staging NGINX site already exists; inspect it before changing" >&2
  exit 1
fi

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y nginx certbot python3-certbot-nginx
install -m 0644 "$source_conf" "$site"
ln -s "$site" "$enabled"
if ! nginx -t; then
  rm -f -- "$enabled" "$site"
  exit 1
fi
if [[ -L /etc/nginx/sites-enabled/default ]]; then
  rm -f -- /etc/nginx/sites-enabled/default
fi
systemctl enable --now nginx
systemctl reload nginx
curl --silent --show-error --fail -H "Host: $domain" http://127.0.0.1/ >/dev/null
echo "Staging NGINX ready locally for $domain; HTTPS waits for DNS"
