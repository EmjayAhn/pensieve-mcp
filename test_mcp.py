#!/usr/bin/env python3
import os
import sys
import json

print(f"Python executable: {sys.executable}")
print(f"Working directory: {os.getcwd()}")
print(f"PENSIEVE_API_URL: {os.getenv('PENSIEVE_API_URL', 'NOT SET')}")

try:
    from mcp_server import server_api
    print("✅ MCP server module loaded successfully")
except Exception as e:
    print(f"❌ Failed to load MCP server module: {e}")
    sys.exit(1)

print("✅ Test completed successfully")