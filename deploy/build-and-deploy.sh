#!/usr/bin/env bash
# Run from a clean, detached worktree on the Linux build machine.
set -euo pipefail

expected_sha="${1:?Pass the exact 40-character commit SHA}"
if [[ ! "$expected_sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Invalid commit SHA" >&2
  exit 1
fi
if [[ "$(git rev-parse HEAD)" != "$expected_sha" ]]; then
  echo "Worktree HEAD does not match the requested commit" >&2
  exit 1
fi
if [[ -n "$(git status --porcelain --untracked-files=normal)" ]]; then
  echo "Build worktree must be clean" >&2
  exit 1
fi

# The build machine keeps owner-only env files. Only public values are
# exported to Next.js; the full selected file is streamed to the target over SSH.
build_env_file="${BUILD_ENV_FILE:-/home/internetremovals/.config/ignyte/build.env}"
deploy_target="${DEPLOY_SSH_TARGET:-root@172.105.186.242}"
deploy_remote_prefix="${DEPLOY_REMOTE_PREFIX:-}"
ssh_options=(-o BatchMode=yes -o StrictHostKeyChecking=yes)
if [[ -n "${DEPLOY_SSH_IDENTITY:-}" ]]; then
  ssh_options+=(-i "$DEPLOY_SSH_IDENTITY" -o IdentitiesOnly=yes)
fi
if [[ "$deploy_remote_prefix" != "" && "$deploy_remote_prefix" != "sudo" ]]; then
  echo "DEPLOY_REMOTE_PREFIX must be empty or sudo" >&2
  exit 1
fi
remote_install=(bash -s -- "$expected_sha")
if [[ "$deploy_remote_prefix" == "sudo" ]]; then
  remote_install=(sudo "${remote_install[@]}")
fi
if [[ -f "$build_env_file" ]]; then
  if [[ -L "$build_env_file" || ! -O "$build_env_file" ]]; then
    echo "Ignyte build env must be a regular file owned by the build user" >&2
    exit 1
  fi
  chmod 0600 "$build_env_file"
  has_secret_key=false
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" == \#* ]] && continue
    if [[ "$line" != *=* || "$line" == *$'\r'* ]]; then
      echo "Invalid Ignyte build setting line" >&2
      exit 1
    fi
    name="${line%%=*}"
    value="${line#*=}"
    case "$name" in
      NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|NEXT_PUBLIC_SITE_URL)
        export "$name=$value" ;;
      SUPABASE_SECRET_KEY)
        [[ -n "$value" ]] && has_secret_key=true ;;
      EWAY_API_KEY|EWAY_API_PASSWORD|EWAY_ENVIRONMENT)
        # Server-only settings are copied to the target env file, never exported to the build.
        ;;
      SES_AWS_ACCESS_KEY_ID|SES_AWS_SECRET_ACCESS_KEY|SES_AWS_SESSION_TOKEN|SES_AWS_REGION|SES_FROM_EMAIL|ORDER_NOTIFICATION_EMAIL)
        # Server-only mail settings are copied to the target env file, never exported to the build.
        ;;
      *) echo "Unexpected build setting name: $name" >&2; exit 1 ;;
    esac
  done < "$build_env_file"
  unset line name value
fi
export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://ignyte.theblackcat94.com}"
if [[ -f "$build_env_file" ]] &&
   { [[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]] ||
     [[ -z "${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}" ]] ||
     [[ "$has_secret_key" != true ]]; }; then
  echo "Ignyte build env requires Supabase URL, publishable key and secret key" >&2
  exit 1
fi

# Ignyte carries its own Node binary to the Linode. Keep it on a version
# supported by the Supabase SDK without changing the build machine's Node.
ignyte_node_dir=/home/internetremovals/.local/opt/node-v22.23.4-linux-x64/bin
if [[ ! -x "$ignyte_node_dir/node" ]]; then
  echo "Install the pinned Ignyte Node with deploy/install-build-node.sh first" >&2
  exit 1
fi
export PATH="$ignyte_node_dir:$PATH"
test "$(node --version)" = v22.23.4

npm ci
BUILD_STANDALONE=true npm run build
test -f .next/standalone/server.js

stage="$(mktemp -d /tmp/ignyte-build-XXXXXX)"
cleanup() { [[ "$stage" == /tmp/ignyte-build-* ]] && rm -rf -- "$stage"; }
trap cleanup EXIT
mkdir -p "$stage/app/.next"
cp -a .next/standalone/. "$stage/app/"
cp -a .next/static "$stage/app/.next/static"
cp -a public "$stage/app/public"
cp "$(readlink -f "$(command -v node)")" "$stage/app/node"
printf '%s\n' "$expected_sha" > "$stage/app/revision"

if find "$stage/app" -type f \( -name '.env' -o -name '.env.*' -o -name '*.pem' -o -name '*.key' \) -print -quit | grep -q .; then
  echo "Package contains a credential-like file; deployment stopped" >&2
  exit 1
fi

archive="$stage/ignyte-$expected_sha.tar.gz"
tar -C "$stage/app" -czf "$archive" .
scp "${ssh_options[@]}" "$archive" "$deploy_target:/tmp/ignyte-$expected_sha.tar.gz"
if [[ -f "$build_env_file" ]]; then
  ssh "${ssh_options[@]}" "$deploy_target" \
    "umask 077; cat > /tmp/ignyte-env-$expected_sha" < "$build_env_file"
fi
ssh "${ssh_options[@]}" "$deploy_target" \
  "${remote_install[@]}" < deploy/install-release.sh
echo "Deployed commit $expected_sha to $deploy_target"
