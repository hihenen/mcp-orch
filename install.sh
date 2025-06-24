#!/bin/bash

# MCP Orchestrator Hybrid Installation Script
# This script installs MCP Orchestrator with optimal architecture:
# - Database: Flexible (Local PostgreSQL, AWS RDS, Aurora, etc.)
# - Backend: Native Python installation for MCP server compatibility  
# - Frontend: Docker container for easy deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="/opt/mcp-orchestrator"
SERVICE_USER="mcp-orch"
CONFIG_DIR="/etc/mcp-orchestrator"
LOG_DIR="/var/log/mcp-orchestrator"

# Default ports
BACKEND_PORT=8000
FRONTEND_PORT=3000

echo -e "${BLUE}🚀 MCP Orchestrator Hybrid Installation${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    echo -e "${RED}❌ This script should not be run as root${NC}"
    echo -e "${YELLOW}Please run as a regular user with sudo privileges${NC}"
    exit 1
fi

# Function to print status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check command availability
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is not installed"
        return 1
    fi
    return 0
}

# Function to install system dependencies
install_dependencies() {
    print_status "Installing system dependencies..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Ubuntu/Debian
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y python3 python3-pip python3-venv git curl docker.io docker-compose postgresql-client
            sudo systemctl enable docker
            sudo systemctl start docker
            sudo usermod -aG docker $USER
        # CentOS/RHEL/Fedora
        elif command -v yum &> /dev/null; then
            sudo yum update -y
            sudo yum install -y python3 python3-pip git curl docker docker-compose postgresql
            sudo systemctl enable docker
            sudo systemctl start docker
            sudo usermod -aG docker $USER
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if ! command -v brew &> /dev/null; then
            print_error "Homebrew is required for macOS installation"
            print_status "Install Homebrew: https://brew.sh"
            exit 1
        fi
        brew install python3 git curl docker docker-compose postgresql
    fi
    
    print_success "System dependencies installed"
}

# Function to choose installation type
choose_installation_type() {
    echo ""
    echo -e "${BLUE}Choose Installation Type:${NC}"
    echo "1) Minimal (SQLite + Local execution)"
    echo "2) Standard (PostgreSQL Docker + Native Backend)" 
    echo "3) Production (External DB + System service)"
    echo "4) Enterprise (High availability + Monitoring)"
    echo ""
    
    while true; do
        read -p "Enter choice (1-4): " choice
        case $choice in
            1)
                INSTALL_TYPE="minimal"
                DB_TYPE="sqlite"
                break
                ;;
            2)
                INSTALL_TYPE="standard"
                DB_TYPE="docker_postgres"
                break
                ;;
            3)
                INSTALL_TYPE="production"
                DB_TYPE="external"
                break
                ;;
            4)
                INSTALL_TYPE="enterprise"
                DB_TYPE="external"
                break
                ;;
            *)
                print_error "Invalid choice. Please enter 1-4."
                ;;
        esac
    done
    
    print_success "Selected $INSTALL_TYPE installation with $DB_TYPE database"
}

# Function to setup database
setup_database() {
    print_status "Setting up database..."
    
    case $DB_TYPE in
        "sqlite")
            DATABASE_URL="sqlite:///$(pwd)/mcp_orch.db"
            print_success "SQLite database will be created at: $(pwd)/mcp_orch.db"
            ;;
        "docker_postgres")
            print_status "Starting PostgreSQL with Docker..."
            cat > docker-compose.db.yml << EOF
version: '3.8'
services:
  postgres:
    image: postgres:15
    container_name: mcp-orch-postgres
    environment:
      POSTGRES_DB: mcp_orch
      POSTGRES_USER: mcp_orch
      POSTGRES_PASSWORD: mcp_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
EOF
            docker compose -f docker-compose.db.yml up -d
            DATABASE_URL="postgresql://mcp_orch:mcp_password@localhost:5432/mcp_orch"
            print_success "PostgreSQL started with Docker"
            ;;
        "external")
            echo ""
            print_status "External Database Configuration"
            echo "Supported databases: PostgreSQL (AWS RDS, Aurora, Supabase, Google Cloud SQL)"
            echo ""
            echo "Examples:"
            echo "  AWS RDS: postgresql://user:pass@xxx.rds.amazonaws.com:5432/mcp_orch"
            echo "  Aurora: postgresql://user:pass@cluster.cluster-xxx.us-east-1.rds.amazonaws.com:5432/mcp_orch"
            echo "  Supabase: postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres"
            echo ""
            
            while true; do
                read -p "Enter database URL: " DATABASE_URL
                if [[ $DATABASE_URL =~ ^postgresql:// ]]; then
                    break
                else
                    print_error "Please enter a valid PostgreSQL URL starting with postgresql://"
                fi
            done
            
            print_success "External database configured"
            ;;
    esac
}

# Function to install Python backend
install_backend() {
    print_status "Installing MCP Orchestrator backend..."
    
    # Create directories
    sudo mkdir -p $INSTALL_DIR $CONFIG_DIR $LOG_DIR
    
    # Clone repository
    if [ ! -d "$INSTALL_DIR/src" ]; then
        print_status "Cloning repository..."
        sudo git clone https://github.com/your-org/mcp-orchestrator.git $INSTALL_DIR
    fi
    
    # Create virtual environment
    print_status "Creating Python virtual environment..."
    sudo python3 -m venv $INSTALL_DIR/venv
    sudo $INSTALL_DIR/venv/bin/pip install --upgrade pip
    
    # Install backend dependencies
    print_status "Installing Python dependencies..."
    sudo $INSTALL_DIR/venv/bin/pip install -r $INSTALL_DIR/requirements.txt
    
    # Create configuration file
    print_status "Creating configuration file..."
    sudo tee $CONFIG_DIR/config.yml > /dev/null << EOF
# MCP Orchestrator Configuration
database:
  url: "$DATABASE_URL"
  
server:
  host: "0.0.0.0"
  port: $BACKEND_PORT
  
security:
  jwt_secret: "$(openssl rand -hex 32)"
  
logging:
  level: "INFO"
  file: "$LOG_DIR/backend.log"
  
mcp:
  # MCP servers will be able to execute npm, node, docker commands
  allow_host_commands: true
  workspace_dir: "/var/lib/mcp-orchestrator/workspaces"
EOF
    
    # Create service user
    if ! id "$SERVICE_USER" &>/dev/null; then
        print_status "Creating service user..."
        sudo useradd --system --home $INSTALL_DIR --shell /bin/bash $SERVICE_USER
    fi
    
    # Set permissions
    sudo chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR $LOG_DIR
    sudo chmod -R 755 $INSTALL_DIR
    sudo chmod -R 755 $LOG_DIR
    
    # Create workspace directory
    sudo mkdir -p /var/lib/mcp-orchestrator/workspaces
    sudo chown -R $SERVICE_USER:$SERVICE_USER /var/lib/mcp-orchestrator
    
    print_success "Backend installed successfully"
}

# Function to setup systemd service
setup_systemd_service() {
    if [[ "$INSTALL_TYPE" == "minimal" ]]; then
        print_status "Skipping systemd service for minimal installation"
        return
    fi
    
    print_status "Setting up systemd service..."
    
    sudo tee /etc/systemd/system/mcp-orchestrator.service > /dev/null << EOF
[Unit]
Description=MCP Orchestrator Backend
After=network.target
Wants=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
Environment=PATH=$INSTALL_DIR/venv/bin
ExecStart=$INSTALL_DIR/venv/bin/python -m uvicorn src.mcp_orch.api.app:app --host 0.0.0.0 --port $BACKEND_PORT
Restart=always
RestartSec=10

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$LOG_DIR /var/lib/mcp-orchestrator /tmp

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable mcp-orchestrator
    
    print_success "Systemd service configured"
}

# Function to setup frontend
setup_frontend() {
    print_status "Setting up frontend container..."
    
    cat > docker-compose.frontend.yml << EOF
version: '3.8'
services:
  frontend:
    image: mcp-orchestrator-frontend:latest
    container_name: mcp-orch-frontend
    ports:
      - "$FRONTEND_PORT:3000"
    environment:
      - NEXT_PUBLIC_MCP_API_URL=http://localhost:$BACKEND_PORT
      - NEXTAUTH_URL=http://localhost:$FRONTEND_PORT
      - NEXTAUTH_SECRET=$(openssl rand -hex 32)
    restart: unless-stopped
    depends_on:
      - backend
EOF
    
    print_success "Frontend configuration created"
}

# Function to run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Wait for database to be ready
    if [[ "$DB_TYPE" == "docker_postgres" ]]; then
        print_status "Waiting for PostgreSQL to be ready..."
        sleep 10
    fi
    
    cd $INSTALL_DIR
    sudo -u $SERVICE_USER $INSTALL_DIR/venv/bin/alembic upgrade head
    
    print_success "Database migrations completed"
}

# Function to start services
start_services() {
    print_status "Starting services..."
    
    case $INSTALL_TYPE in
        "minimal")
            print_status "Starting backend in foreground mode..."
            print_status "You can access the web interface at: http://localhost:$FRONTEND_PORT"
            print_status "Backend API will be available at: http://localhost:$BACKEND_PORT"
            print_status ""
            print_status "To start manually:"
            print_status "cd $INSTALL_DIR && $INSTALL_DIR/venv/bin/python -m uvicorn src.mcp_orch.api.app:app --host 0.0.0.0 --port $BACKEND_PORT"
            ;;
        "standard"|"production"|"enterprise")
            sudo systemctl start mcp-orchestrator
            print_success "Backend service started"
            
            if [[ "$DB_TYPE" == "docker_postgres" ]]; then
                docker compose -f docker-compose.db.yml up -d
                print_success "Database service started"
            fi
            
            # Note: Frontend docker image needs to be built separately
            print_status "Frontend setup requires building Docker image"
            print_status "Run: docker build -t mcp-orchestrator-frontend -f Dockerfile.frontend ."
            ;;
    esac
}

# Function to display completion message
display_completion_message() {
    echo ""
    echo -e "${GREEN}🎉 MCP Orchestrator Installation Complete!${NC}"
    echo -e "${GREEN}=======================================!${NC}"
    echo ""
    echo -e "${BLUE}🔗 Access URLs:${NC}"
    echo "   Web Interface: http://localhost:$FRONTEND_PORT"
    echo "   Backend API:   http://localhost:$BACKEND_PORT"
    echo "   API Docs:      http://localhost:$BACKEND_PORT/docs"
    echo ""
    echo -e "${BLUE}📁 Important Paths:${NC}"
    echo "   Installation:  $INSTALL_DIR"
    echo "   Configuration: $CONFIG_DIR/config.yml"
    echo "   Logs:          $LOG_DIR/"
    echo "   Workspaces:    /var/lib/mcp-orchestrator/workspaces"
    echo ""
    echo -e "${BLUE}🔧 Management Commands:${NC}"
    if [[ "$INSTALL_TYPE" != "minimal" ]]; then
        echo "   Start service:   sudo systemctl start mcp-orchestrator"
        echo "   Stop service:    sudo systemctl stop mcp-orchestrator"
        echo "   Restart service: sudo systemctl restart mcp-orchestrator"
        echo "   View logs:       sudo journalctl -u mcp-orchestrator -f"
    fi
    echo "   Update install:  git pull && pip install -r requirements.txt"
    echo ""
    echo -e "${BLUE}📖 Next Steps:${NC}"
    echo "1. Access the web interface and create your first admin user"
    echo "2. Create a project and invite team members"
    echo "3. Add MCP servers (npm packages, docker containers, etc.)"
    echo "4. Configure your AI tools (Cline, Cursor, etc.) to use the SSE endpoints"
    echo ""
    echo -e "${YELLOW}⚠️  Important Notes:${NC}"
    echo "• MCP servers run natively on the host for optimal compatibility"
    echo "• Database URL can be changed in $CONFIG_DIR/config.yml"
    echo "• For production deployments, consider using external databases (AWS RDS, Aurora)"
    echo "• Enterprise features (SSO, advanced monitoring) available with commercial license"
    echo ""
    print_success "Installation completed successfully!"
}

# Main installation flow
main() {
    print_status "Starting MCP Orchestrator installation..."
    
    # Pre-installation checks
    check_command "python3" || exit 1
    check_command "git" || exit 1
    check_command "curl" || exit 1
    
    # Installation steps
    install_dependencies
    choose_installation_type
    setup_database
    install_backend
    setup_systemd_service
    setup_frontend
    run_migrations
    start_services
    display_completion_message
}

# Error handling
trap 'print_error "Installation failed. Check the logs above for details."; exit 1' ERR

# Run main installation
main "$@"