#!/usr/bin/env bash
# Run once on the Linode after the app release is healthy.
set -euo pipefail
domain=ignyte.theblackcat94.com
site="/etc/nginx/sites-available/$domain"
enabled="/etc/nginx/sites-enabled/$domain"
source_conf="/tmp/ignyte.nginx.conf"

test -f /opt/ignyte/current/revision
test -f "$source_conf"
if [[ -e "$site" || -e "$enabled" || -L "$enabled" ]]; then
  echo "Ignyte NGINX site already exists; inspect it before changing" >&2
  exit 1
fi
install -m 0644 "$source_conf" "$site"
ln -s "$site" "$enabled"
if ! nginx -t; then
  rm -f -- "$enabled" "$site"
  exit 1
fi
systemctl reload nginx
certbot --nginx --non-interactive --agree-tos --redirect -d "$domain"
nginx -t
systemctl reload nginx
curl --silent --show-error --fail --max-time 15 "https://$domain/" >/dev/null
echo "HTTPS ready at https://$domain/"
