#!/bin/sh
# Start opendataloader-pdf hybrid docling backend, wait for health, then run the worker.
set -e

/opt/odl-hybrid/bin/opendataloader-pdf-hybrid --port 5002 --enrich-formula &
BACKEND_PID=$!

for i in $(seq 1 60); do
  if curl -sf http://127.0.0.1:5002/health >/dev/null 2>&1; then
    echo "[entrypoint] hybrid backend ready"
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "[entrypoint] hybrid backend failed to start" >&2
    exit 1
  fi
  sleep 2
done

"$@"
