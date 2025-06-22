#!/bin/bash

# MCP Orchestrator - Standard Setup Script
# Sets up PostgreSQL with Docker and prepares for native backend

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

echo -e "${BLUE}🔧 MCP Orchestrator Standard Setup${NC}"
echo -e "${BLUE}===================================${NC}"
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Function to check Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        echo -e "${YELLOW}Please install Docker first: https://docs.docker.com/get-docker/${NC}"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker daemon is not running${NC}"
        echo -e "${YELLOW}Please start Docker and try again${NC}"
        exit 1
    fi
}

# Function to generate secure password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Check dependencies
check_docker

# Create necessary directories
echo -e "${BLUE}Creating directories...${NC}"
mkdir -p logs workspaces configs/postgres
sudo mkdir -p /var/log/mcp-orchestrator /var/lib/mcp-orchestrator/workspaces

# Generate passwords if not in env
if [ ! -f ".env" ]; then
    echo -e "${BLUE}Creating .env file...${NC}"
    DB_PASSWORD=$(generate_password)
    JWT_SECRET=$(openssl rand -hex 32)
    NEXTAUTH_SECRET=$(openssl rand -hex 32)
    
    cat > .env << EOF
# MCP Orchestrator Standard Configuration
# Generated on $(date)

# Database
DATABASE_URL=postgresql://mcp_user:${DB_PASSWORD}@localhost:5432/mcp_orch
DB_USER=mcp_user
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=mcp_orch
DB_HOST=localhost
DB_PORT=5432

# Security
JWT_SECRET=${JWT_SECRET}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
AUTH_SECRET=${NEXTAUTH_SECRET}

# Server
SERVER__HOST=0.0.0.0
SERVER__PORT=8000
FRONTEND_PORT=3000

# URLs
NEXT_PUBLIC_MCP_API_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000

# Admin
INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=changeme123

# MCP Settings
MCP_WORKSPACE_DIR=/var/lib/mcp-orchestrator/workspaces
MCP_ALLOW_HOST_COMMANDS=true
MAX_CONCURRENT_SERVERS=20
EOF
    
    echo -e "${GREEN}✅ Created .env file with secure passwords${NC}"
    echo -e "${YELLOW}⚠️  Please update INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD${NC}"
fi

# Create PostgreSQL init script
echo -e "${BLUE}Creating PostgreSQL init script...${NC}"
cat > configs/postgres/init.sql << 'EOF'
-- MCP Orchestrator Database Initialization
-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create database if not exists (run as superuser)
SELECT 'CREATE DATABASE mcp_orch'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'mcp_orch')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE mcp_orch TO mcp_user;
EOF

# Start PostgreSQL with Docker
echo -e "${BLUE}Starting PostgreSQL with Docker...${NC}"
docker-compose -f docker-compose.hybrid.yml up -d postgresql

# Wait for PostgreSQL to be ready
echo -e "${BLUE}Waiting for PostgreSQL to be ready...${NC}"
for i in {1..30}; do
    if docker-compose -f docker-compose.hybrid.yml exec -T postgresql pg_isready -U mcp_user -d mcp_orch &> /dev/null; then
        echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Set up Python environment
echo -e "${BLUE}Setting up Python environment...${NC}"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q --upgrade pip
pip install -q -e .

# Copy standard config
if [ ! -f "config.yml" ]; then
    echo -e "${BLUE}Creating standard configuration...${NC}"
    cp configs/standard.yml config.yml
fi

# Run database migrations
echo -e "${BLUE}Running database migrations...${NC}"
source .env
alembic upgrade head

# Create initial admin user
echo -e "${BLUE}Creating initial admin user...${NC}"
python create_admin_user.py

# Create systemd service file
echo -e "${BLUE}Creating systemd service file...${NC}"
sudo tee /etc/systemd/system/mcp-orchestrator.service > /dev/null << EOF
[Unit]
Description=MCP Orchestrator Backend
After=network.target docker.service
Wants=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_ROOT
Environment="PATH=$PROJECT_ROOT/venv/bin:/usr/local/bin:/usr/bin:/bin"
EnvironmentFile=$PROJECT_ROOT/.env
ExecStart=$PROJECT_ROOT/venv/bin/uvicorn src.mcp_orch.api.app:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Set permissions
sudo chown -R $USER:$USER /var/log/mcp-orchestrator /var/lib/mcp-orchestrator

echo ""
echo -e "${GREEN}🎉 Standard setup complete!${NC}"
echo -e "${GREEN}===========================${NC}"
echo ""
echo -e "${BLUE}Database:${NC} PostgreSQL running on port 5432"
echo -e "${BLUE}Config:${NC} .env and config.yml created"
echo -e "${BLUE}Service:${NC} systemd service configured"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review and update .env file (especially admin credentials)"
echo "2. Start the backend: sudo systemctl start mcp-orchestrator"
echo "3. Enable auto-start: sudo systemctl enable mcp-orchestrator"
echo "4. Build frontend: cd web && pnpm install && pnpm build"
echo "5. Start frontend: docker-compose -f docker-compose.hybrid.yml --profile frontend up -d"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "- View logs: sudo journalctl -u mcp-orchestrator -f"
echo "- Check status: sudo systemctl status mcp-orchestrator"
echo "- Restart: sudo systemctl restart mcp-orchestrator"
echo "- Stop database: docker-compose -f docker-compose.hybrid.yml down"