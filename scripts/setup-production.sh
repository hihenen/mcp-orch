#!/bin/bash

# MCP Orchestrator - Production Setup Script
# For production deployments with external database

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

echo -e "${BLUE}🏭 MCP Orchestrator Production Setup${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Function to validate database URL
validate_database_url() {
    local url=$1
    if [[ ! $url =~ ^postgresql:// ]]; then
        echo -e "${RED}❌ Invalid database URL format${NC}"
        echo -e "${YELLOW}URL must start with postgresql://${NC}"
        return 1
    fi
    
    # Test connection
    echo -e "${BLUE}Testing database connection...${NC}"
    if python3 -c "
import os
os.environ['DATABASE_URL'] = '$url'
from sqlalchemy import create_engine
engine = create_engine('$url')
conn = engine.connect()
conn.close()
print('✅ Database connection successful')
" 2>/dev/null; then
        return 0
    else
        echo -e "${RED}❌ Failed to connect to database${NC}"
        return 1
    fi
}

# Function to generate secure secrets
generate_secrets() {
    JWT_SECRET=$(openssl rand -hex 32)
    NEXTAUTH_SECRET=$(openssl rand -hex 32)
    API_KEY_SALT=$(openssl rand -hex 32)
}

# Check if running as appropriate user
if [[ $EUID -eq 0 ]]; then
    echo -e "${RED}❌ Do not run this script as root${NC}"
    exit 1
fi

# Get production configuration
echo -e "${BLUE}Production Database Configuration${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""
echo "Supported databases:"
echo "  - AWS RDS PostgreSQL"
echo "  - AWS Aurora PostgreSQL"
echo "  - Google Cloud SQL PostgreSQL"
echo "  - Azure Database for PostgreSQL"
echo "  - Any PostgreSQL 12+ compatible database"
echo ""

# Get database URL
if [ -z "$DATABASE_URL" ]; then
    echo "Enter your production database URL:"
    echo "Example: postgresql://user:pass@host:5432/dbname"
    read -p "DATABASE_URL: " DATABASE_URL
fi

# Validate database connection
if ! validate_database_url "$DATABASE_URL"; then
    exit 1
fi

# Get frontend URL
if [ -z "$FRONTEND_URL" ]; then
    echo ""
    echo "Enter your frontend URL (e.g., https://mcp.yourcompany.com):"
    read -p "FRONTEND_URL: " FRONTEND_URL
fi

# Create production directories
echo -e "${BLUE}Creating production directories...${NC}"
sudo mkdir -p /opt/mcp-orchestrator/{bin,config,logs}
sudo mkdir -p /var/lib/mcp-orchestrator/workspaces
sudo mkdir -p /var/log/mcp-orchestrator

# Set up Python environment
echo -e "${BLUE}Setting up Python environment...${NC}"
if [ ! -d "/opt/mcp-orchestrator/venv" ]; then
    sudo python3 -m venv /opt/mcp-orchestrator/venv
fi

sudo /opt/mcp-orchestrator/venv/bin/pip install --upgrade pip
sudo /opt/mcp-orchestrator/venv/bin/pip install -e .

# Generate secrets
echo -e "${BLUE}Generating secure secrets...${NC}"
generate_secrets

# Create production .env file
echo -e "${BLUE}Creating production configuration...${NC}"
sudo tee /opt/mcp-orchestrator/config/.env > /dev/null << EOF
# MCP Orchestrator Production Configuration
# Generated on $(date)
# ⚠️  KEEP THIS FILE SECURE - Contains sensitive credentials

# Environment
ENV=production

# Database (External)
DATABASE_URL=${DATABASE_URL}

# Security
JWT_SECRET=${JWT_SECRET}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
AUTH_SECRET=${NEXTAUTH_SECRET}
API_KEY_SALT=${API_KEY_SALT}

# Server Configuration
SERVER__HOST=0.0.0.0
SERVER__PORT=8000
WORKERS=4

# Frontend URL
FRONTEND_URL=${FRONTEND_URL}
NEXTAUTH_URL=${FRONTEND_URL}
NEXT_PUBLIC_MCP_API_URL=${FRONTEND_URL}/api

# Logging
LOG_LEVEL=INFO
LOG_FILE=/var/log/mcp-orchestrator/backend.log

# MCP Settings
MCP_WORKSPACE_DIR=/var/lib/mcp-orchestrator/workspaces
MCP_ALLOW_HOST_COMMANDS=true
MAX_CONCURRENT_SERVERS=100
MCP_TIMEOUT_SECONDS=120

# Performance
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=40

# Security Headers
SECURE_HEADERS=true
HSTS_ENABLED=true
CORS_ORIGINS=${FRONTEND_URL}

# Monitoring
METRICS_ENABLED=true
HEALTH_CHECK_ENABLED=true
EOF

# Copy production config
sudo cp configs/production.yml /opt/mcp-orchestrator/config/config.yml

# Create production user
if ! id "mcp-orch" &>/dev/null; then
    echo -e "${BLUE}Creating production user...${NC}"
    sudo useradd --system --home /opt/mcp-orchestrator --shell /bin/bash mcp-orch
fi

# Create systemd service
echo -e "${BLUE}Creating systemd service...${NC}"
sudo tee /etc/systemd/system/mcp-orchestrator.service > /dev/null << 'EOF'
[Unit]
Description=MCP Orchestrator Production Service
After=network.target
Wants=network.target

[Service]
Type=simple
User=mcp-orch
Group=mcp-orch
WorkingDirectory=/opt/mcp-orchestrator
EnvironmentFile=/opt/mcp-orchestrator/config/.env
ExecStart=/opt/mcp-orchestrator/venv/bin/gunicorn \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --access-logfile /var/log/mcp-orchestrator/access.log \
    --error-logfile /var/log/mcp-orchestrator/error.log \
    --timeout 120 \
    --keepalive 5 \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    src.mcp_orch.api.app:app

Restart=always
RestartSec=10
StandardOutput=append:/var/log/mcp-orchestrator/service.log
StandardError=append:/var/log/mcp-orchestrator/service-error.log

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/mcp-orchestrator /var/lib/mcp-orchestrator

[Install]
WantedBy=multi-user.target
EOF

# Create log rotation config
echo -e "${BLUE}Setting up log rotation...${NC}"
sudo tee /etc/logrotate.d/mcp-orchestrator > /dev/null << 'EOF'
/var/log/mcp-orchestrator/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 mcp-orch mcp-orch
    sharedscripts
    postrotate
        systemctl reload mcp-orchestrator >/dev/null 2>&1 || true
    endscript
}
EOF

# Set permissions
echo -e "${BLUE}Setting permissions...${NC}"
sudo chown -R mcp-orch:mcp-orch /opt/mcp-orchestrator
sudo chown -R mcp-orch:mcp-orch /var/lib/mcp-orchestrator
sudo chown -R mcp-orch:mcp-orch /var/log/mcp-orchestrator
sudo chmod 600 /opt/mcp-orchestrator/config/.env

# Run database migrations
echo -e "${BLUE}Running database migrations...${NC}"
sudo -u mcp-orch /opt/mcp-orchestrator/venv/bin/alembic upgrade head

# Create nginx config (optional)
if command -v nginx &> /dev/null; then
    echo -e "${BLUE}Creating nginx configuration...${NC}"
    sudo tee /etc/nginx/sites-available/mcp-orchestrator > /dev/null << EOF
server {
    listen 80;
    server_name ${FRONTEND_URL#https://};
    
    # Redirect to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${FRONTEND_URL#https://};
    
    # SSL configuration (update paths)
    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Backend API proxy
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # SSE endpoints
    location ~ ^/projects/.*/servers/.*/sse {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400;
        chunked_transfer_encoding off;
    }
    
    # Frontend (if using same server)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    echo -e "${GREEN}✅ Nginx configuration created${NC}"
    echo -e "${YELLOW}Note: Update SSL certificate paths in /etc/nginx/sites-available/mcp-orchestrator${NC}"
fi

# Create health check script
echo -e "${BLUE}Creating health check script...${NC}"
sudo tee /opt/mcp-orchestrator/bin/health-check.sh > /dev/null << 'EOF'
#!/bin/bash
curl -f http://localhost:8000/health || exit 1
EOF
sudo chmod +x /opt/mcp-orchestrator/bin/health-check.sh

# Enable and start service
echo -e "${BLUE}Enabling systemd service...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable mcp-orchestrator

echo ""
echo -e "${GREEN}🎉 Production setup complete!${NC}"
echo -e "${GREEN}=============================${NC}"
echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  - Config: /opt/mcp-orchestrator/config/"
echo "  - Logs: /var/log/mcp-orchestrator/"
echo "  - Data: /var/lib/mcp-orchestrator/"
echo ""
echo -e "${YELLOW}⚠️  Important next steps:${NC}"
echo "1. Review /opt/mcp-orchestrator/config/.env"
echo "2. Set up SSL certificates"
echo "3. Configure firewall rules"
echo "4. Set up monitoring and alerting"
echo "5. Configure backup strategy"
echo "6. Create initial admin user"
echo ""
echo -e "${BLUE}Service management:${NC}"
echo "  - Start: sudo systemctl start mcp-orchestrator"
echo "  - Status: sudo systemctl status mcp-orchestrator"
echo "  - Logs: sudo journalctl -u mcp-orchestrator -f"
echo "  - Health: /opt/mcp-orchestrator/bin/health-check.sh"
echo ""
echo -e "${GREEN}Frontend deployment:${NC}"
echo "Deploy the frontend using your preferred method:"
echo "  - Docker: docker compose -f docker-compose.hybrid.yml --profile frontend up -d"
echo "  - Vercel/Netlify: Connect to your Git repository"
echo "  - Static hosting: Build and deploy to CDN"