#!/usr/bin/env bash
# ==============================================================================
# INCOIS 3D Ocean Data Visualization Platform - Run Script
# Launches the FastAPI Scientific Backend on http://localhost:8000
# ==============================================================================

set -e

PORT=${PORT:-8000}
HOST=${HOST:-"0.0.0.0"}

# Find working Python with uvicorn & fastapi
PYTHON_CMD="python3"
if ! python3 -c "import uvicorn, fastapi" 2>/dev/null; then
    if /usr/bin/python3 -c "import uvicorn, fastapi" 2>/dev/null; then
        PYTHON_CMD="/usr/bin/python3"
    fi
fi

echo "=============================================================================="
echo " Starting INCOIS 3D Ocean Data Visualization System"
echo " Using: $(${PYTHON_CMD} --version)"
echo " Access URL: http://localhost:${PORT}"
echo "=============================================================================="

exec "${PYTHON_CMD}" -m uvicorn backend.app:app --host "${HOST}" --port "${PORT}" --reload
