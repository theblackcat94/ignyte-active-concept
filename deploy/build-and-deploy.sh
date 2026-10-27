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

# Only public browser settings are accepted in this optional file.
build_env_file="${BUILD_ENV_FILE:-/home/internetremovals/.config/ignyte/build.env}"
if [[ -f "$build_env_file" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" == \#* ]] && continue
    name="${line%%=*}"
    value="${line#*=}"
    case "$name" in
      NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|NEXT_PUBLIC_SITE_URL)
        export "$name=$value" ;;
      *) echo "Unexpected build setting name: $name" >&2; exit 1 ;;
    esac
  done < "$build_env_file"
fi
export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://ignyte.theblackcat94.com}"
if [[ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" && -z "${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}" ]] ||
   [[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" && -n "${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}" ]]; then
  echo "Supabase URL and publishable key must both be present or both absent" >&2
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
scp -o BatchMode=yes -o StrictHostKeyChecking=yes "$archive" "root@172.105.186.242:/tmp/ignyte-$expected_sha.tar.gz"
ssh -o BatchMode=yes -o StrictHostKeyChecking=yes root@172.105.186.242 \
  bash -s -- "$expected_sha" < deploy/install-release.sh
echo "Deployed commit $expected_sha to the Ignyte Linode app service"
