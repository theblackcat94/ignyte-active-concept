#!/usr/bin/env bash
# Install a verified, Ignyte-only Node runtime on the Linux build machine.
set -euo pipefail
version=v22.23.4
archive="node-$version-linux-x64.tar.xz"
root=/home/internetremovals/.local/opt
target="$root/node-$version-linux-x64"
if [[ -x "$target/bin/node" ]]; then
  test "$("$target/bin/node" --version)" = "$version"
  exit 0
fi
stage="$(mktemp -d /tmp/ignyte-node-XXXXXX)"
cleanup() { [[ "$stage" == /tmp/ignyte-node-* ]] && rm -rf -- "$stage"; }
trap cleanup EXIT
base="https://nodejs.org/download/release/$version"
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 "$base/SHASUMS256.txt" -o "$stage/SHASUMS256.txt"
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 "$base/$archive" -o "$stage/$archive"
cd "$stage"
grep -F "  $archive" SHASUMS256.txt | sha256sum --check --status
mkdir -p "$root"
tar -xJf "$archive" -C "$root"
test "$("$target/bin/node" --version)" = "$version"
echo "Ignyte build Node $version installed in $target"
