#!/bin/bash
set -e

API_URL="${API_URL:-http://localhost:8010}"
OUTPUT_PATH="${OUTPUT_PATH:-src/types/api.d.ts}"

# Detect monorepo: if packages/shared exists, use shared package output path
if [ -d "packages/shared" ]; then
    OUTPUT_PATH="packages/shared/src/types/api.d.ts"
fi

echo "Checking API availability at ${API_URL}..."
for i in $(seq 1 10); do
    if curl -sf "${API_URL}/health" > /dev/null 2>&1; then
        echo "API is available."
        break
    fi
    if [ "$i" -eq 10 ]; then
        echo "ERROR: API at ${API_URL} is not available after 10 attempts."
        echo "Make sure the backend is running: docker compose up -d backend"
        exit 1
    fi
    echo "  attempt $i/10 — waiting 3s..."
    sleep 3
done

echo "Generating TypeScript types from OpenAPI schema..."
echo "  Source: ${API_URL}/openapi.json"
echo "  Output: ${OUTPUT_PATH}"

# Ensure output directory exists
mkdir -p "$(dirname "${OUTPUT_PATH}")"

npx openapi-typescript@7 "${API_URL}/openapi.json" -o "${OUTPUT_PATH}"
echo "Done!"
