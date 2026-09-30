#!/usr/bin/env bash
# Pulls the two Ollama models this platform depends on.
# Usage: OLLAMA_BASE_URL=http://localhost:11434 ./scripts/pull_models.sh
set -euo pipefail

OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://localhost:11434}"

echo "Waiting for Ollama at ${OLLAMA_BASE_URL} ..."
until curl -sf "${OLLAMA_BASE_URL}/api/tags" > /dev/null; do
  sleep 2
done

echo "Pulling nomic-embed-text (768-dim embeddings)..."
curl -sf "${OLLAMA_BASE_URL}/api/pull" -d '{"name": "nomic-embed-text"}'

echo "Pulling llama3 (chat + tool-calling agent)..."
curl -sf "${OLLAMA_BASE_URL}/api/pull" -d '{"name": "llama3"}'

echo "All models pulled successfully."
