#!/usr/bin/env bash
set -euo pipefail

[[ "${GITHUB_REPOSITORY:-}" == wllmslv10/central-estudos-biblicos-v2 ]]
[[ "${GITHUB_REF:-}" == refs/heads/deploy/ceb-oficial-ibne ]]
[[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]
export CLOUDFLARE_ACCOUNT_ID=f56673173860a1b8427a494fc91d0ee3
readonly official=https://ceb.ibne.workers.dev
readonly api="https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/ceb"
temp=$(mktemp -d)
trap 'rm -rf "$temp"' EXIT

cloudflare() {
  printf 'header = "Authorization: Bearer %s"\n' "$CLOUDFLARE_API_TOKEN" |
    curl -fsS --max-time 30 --config - "$@"
}

active_version() {
  cloudflare "$api/deployments" |
    jq -er '.result.deployments[0].versions | select(length == 1) | .[0] | select(.percentage == 100) | .version_id'
}

switch_version() {
  local version=$1
  cloudflare --json "$(jq -nc --arg id "$version" '{strategy:"percentage",versions:[{version_id:$id,percentage:100}]}')" "$api/deployments" |
    jq -er '.result.id'
}

verify_health() {
  curl -fsS --max-time 15 "$official/health" |
    jq -e '.api == "online" and .database == "conectado" and (.tabelas | length > 0 and all(.[]; . == true))' >/dev/null
}

verify_release() {
  local bundle
  bundle=$(sed -n 's/.*src="\/central-estudos-biblicos-v2\/\(assets\/index-[^"]*\.js\)".*/\1/p' dist/index.html) || return
  [[ -n "$bundle" ]] || return 1
  curl -fsSL --max-time 20 "$official/" -o "$temp/index.html" || return
  cmp -s "$temp/index.html" dist/index.html || return
  curl -fsS --max-time 30 "$official/central-estudos-biblicos-v2/$bundle" -o "$temp/app.js" || return
  cmp -s "$temp/app.js" "dist/$bundle" || return
  verify_health
}

version_config() {
  cloudflare "$api/versions/$1" |
    jq -eS '.result.resources | {bindings: (.bindings | sort_by(.name)), script_runtime}'
}

previous=$(active_version)
verify_health
version_config "$previous" > "$temp/previous.json"
(
  cd api-worker
  WRANGLER_OUTPUT_FILE_PATH="$temp/upload.ndjson" npx --no-install wrangler versions upload \
    --config wrangler.official.toml --keep-vars --message "CEB IBNE ${GITHUB_SHA}"
)
candidate=$(jq -er 'select(.type == "version-upload") | .version_id' "$temp/upload.ndjson")
version_config "$candidate" > "$temp/candidate.json"
if ! cmp -s "$temp/previous.json" "$temp/candidate.json"; then
  echo 'Os vínculos ou a configuração da versão candidata diferem da versão ativa.'
  exit 1
fi

[[ "$(active_version)" == "$previous" ]]
switch_version "$candidate"
for attempt in 1 2 3 4; do
  if verify_release; then
    printf 'Versão oficial confirmada: %s\n' "$candidate"
    exit 0
  fi
  sleep 8
done

if [[ "$(active_version)" == "$candidate" ]]; then
  switch_version "$previous"
  verify_health
  printf 'Versão anterior restaurada: %s\n' "$previous"
fi
exit 1
