#!/usr/bin/env bash
# ==============================================================================
# INCOIS 3D Ocean Data Visualization Platform - Run Script
# Launches the FastAPI Scientific Backend on http://localhost:8000
# ==============================================================================

set -e

PORT=${PORT:-8000}
HOST=${HOST:-"0.0.0.0"}

echo "=============================================================================="
echo " Starting INCOIS 3D Ocean Data Visualization System"
echo " Access URL: http://localhost:${PORT}"
echo "=============================================================================="

exec python3 -m uvicorn backend.app:app --host "${HOST}" --port "${PORT}" --reload
