#!/bin/bash

# MCP Orchestrator - Minimal Start Script
# For local development and testing with SQLite

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo -e "${BLUE}🚀 Starting MCP Orchestrator (Minimal Mode)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    exit 1
fi

# Change to project root
cd "$PROJECT_ROOT"

# Create necessary directories
mkdir -p logs workspaces

# Set up Python virtual environment if not exists
if [ ! -d "venv" ]; then
    echo -e "${BLUE}Creating Python virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
pip install -q --upgrade pip
pip install -q -e .

# Copy minimal config if not exists
if [ ! -f "config.yml" ]; then
    echo -e "${BLUE}Creating minimal configuration...${NC}"
    cp configs/minimal.yml config.yml
fi

# Set environment variables
export DATABASE_URL="sqlite:///./mcp_orch.db"
export JWT_SECRET=$(openssl rand -hex 32)
export LOG_LEVEL="DEBUG"
export MCP_WORKSPACE_DIR="./workspaces"

# Run database migrations
echo -e "${BLUE}Running database migrations...${NC}"
alembic upgrade head

# Create initial admin user if not exists
echo -e "${BLUE}Checking admin user...${NC}"
python create_admin_user.py

# Start the backend server
echo -e "${GREEN}✅ Starting MCP Orchestrator backend...${NC}"
echo -e "${GREEN}   Backend URL: http://localhost:8000${NC}"
echo -e "${GREEN}   API Docs: http://localhost:8000/docs${NC}"
echo -e "${GREEN}   Frontend: Run 'cd web && pnpm dev' in another terminal${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Run the server
uvicorn src.mcp_orch.api.app:app --host 0.0.0.0 --port 8000 --reload