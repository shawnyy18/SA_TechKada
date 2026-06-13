#!/usr/bin/env bash
set -euo pipefail

OUTPUT_FILE="${1:-deployment.json}"
NETWORK="${STELLAR_NETWORK:-testnet}"

SOURCE="${STELLAR_SOURCE:-${STELLAR_SECRET_KEY:-}}"
if [[ -z "$SOURCE" ]]; then
  echo "STELLAR_SOURCE or STELLAR_SECRET_KEY is required" >&2
  exit 1
fi

SOURCE_ADDRESS="$(stellar keys address "$SOURCE")"

RUSTC="$(rustup which rustc)" \
RUSTDOC="$(rustup which rustdoc)" \
"$(rustup which cargo)" build --workspace --target wasm32v1-none --release

VERIFIER_ID="$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/document_verifier.wasm \
  --source "$SOURCE" \
  --network "$NETWORK" \
  --optimize=false)"

ESCROW_ID="$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/SA_Prime_Properties.wasm \
  --source "$SOURCE" \
  --network "$NETWORK" \
  --optimize=false)"

stellar contract invoke \
  --id "$VERIFIER_ID" \
  --source "$SOURCE" \
  --network "$NETWORK" \
  -- initialize --escrow_contract "$ESCROW_ID"

stellar contract invoke \
  --id "$ESCROW_ID" \
  --source "$SOURCE" \
  --network "$NETWORK" \
  -- initialize --caller "$SOURCE_ADDRESS" --verifier "$VERIFIER_ID"

cat > "$OUTPUT_FILE" <<JSON
{
  "network": "$NETWORK",
  "deployer": "$SOURCE_ADDRESS",
  "escrowContract": "$ESCROW_ID",
  "documentVerifierContract": "$VERIFIER_ID",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON

cat "$OUTPUT_FILE"
