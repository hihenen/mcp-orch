#!/usr/bin/env python3
"""
MCP Orch 서버 실행 스크립트
"""

import os
import uvicorn
from src.mcp_orch.api.app import create_app

if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
