#!/bin/bash
cd "$(dirname "$0")"

# API URL이 설정되어 있으면 API 모드로, 아니면 로컬 모드로 실행
if [ -n "$PENSIEVE_API_URL" ]; then
    export PENSIEVE_API_URL="https://emjay-api.wonderfulglacier-5c83e0ab.koreacentral.azurecontainerapps.io"
    exec /Users/emjayahn/.local/bin/uv run python -m mcp_server.server_api
else
    exec /Users/emjayahn/.local/bin/uv run python -m mcp_server.server
fi