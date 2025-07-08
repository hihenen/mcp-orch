# MCP Orchestrator

<p align="center">
  <strong>The ONLY Model Context Protocol solution with built-in project management and enterprise security</strong>
</p>

<p align="center">
  <a href="https://github.com/hihenen/mcp-orch/stargazers"><img src="https://img.shields.io/github/stars/hihenen/mcp-orch?style=social" alt="GitHub stars"></a>
  <a href="https://github.com/hihenen/mcp-orch/network/members"><img src="https://img.shields.io/github/forks/hihenen/mcp-orch?style=social" alt="GitHub forks"></a>
  <a href="LICENSE.md"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

> **📖 [한국어 버전](./README_KOR.md)** | **🌏 English Version** | **📋 [Changelog](./CHANGELOG.md)**

## 🚀 Why MCP Orchestrator?

While other MCP tools manage servers as a flat list, **MCP Orchestrator** brings **enterprise-grade project management** to the MCP ecosystem:

### 🎯 Unique Features

- **📁 Project-Based Organization** - Manage MCP servers by projects, not just a flat list
- **👥 Team Collaboration** - Invite members, set permissions, track activities
- **🔐 Enterprise Security** - JWT authentication, API keys, audit logs
- **🖥️ Professional Web UI** - 6-tab management interface with real-time monitoring
- **🚀 Production Ready** - Docker support, PostgreSQL backend, scalable architecture

## 📊 How We Compare

> **MCP-Orch is the ONLY solution** that combines project management, team collaboration, and enterprise security in one platform.

| What You Need | Other Tools | MCP-Orch |
|---------------|-------------|----------|
| Organize by projects? | ❌ Flat server list | ✅ **Project-based** |
| Team collaboration? | ❌ Single user | ✅ **Multi-user with permissions** |
| Enterprise security? | ⚠️ Basic auth only | ✅ **JWT + API Keys + Audit logs** |
| Professional UI? | ⚠️ Basic or CLI only | ✅ **Full web dashboard** |
| Ready for production? | ⚠️ Experimental | ✅ **Battle-tested** |

## 🛠️ Key Features

- **🏛️ MCP Command Center**: Unified endpoint that aggregates multiple MCP servers into a single access point
- **🔐 Enterprise Security**: Secure architecture with centralized access control, audit trails, and compliance monitoring
- **🎯 Flexible Management**: Choose individual server control or unified orchestration - start safe, scale smart
- **👥 Team Collaboration**: Real-time collaboration with role-based permissions and member management
- **🔄 One-Click Integration**: Auto-generated secure endpoints for Cursor, Cline, Claude, and all MCP tools
- **📊 Complete Visibility**: Track server usage, team activities, and system performance across your entire MCP infrastructure
- **🏗️ Enterprise Ready**: Self-hosted deployment with scalable architecture and governance controls
- **🔌 Universal Compatibility**: Standard MCP protocol with dual transport support (SSE + Streamable HTTP) and namespace-based tool routing

## 🏗️ Architecture

```
┌─────────────────┐   HTTPS/SSE   ┌──────────────────┐
│   AI Tools      │ ◄────────────► │   Web Interface  │
│ (Cursor, Cline) │   +JWT Auth    │  (React/Next.js) │
└─────────────────┘                └──────────────────┘
         │                                    │
         │ Project-based                      │ Team Management
         │ Secure Endpoints                   │ Real-time Updates
         │                                    │
         ▼                                    ▼
┌─────────────────────────────────────────────────────────┐
│              MCP Orchestrator Core                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Project   │  │    Team     │  │  Activity   │     │
│  │  Manager    │  │  Manager    │  │   Logger    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │    API      │  │   Server    │  │   Access    │     │
│  │   Gateway   │  │  Registry   │  │  Control    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
         │
         │ stdio/subprocess
         ▼
┌─────────────────┐
│   MCP Servers   │
│ (GitHub, Slack, │
│  Notion, etc.)  │
└─────────────────┘
```

## Quick Start

Choose your deployment option:

### 🎯 Option 1: Local Development (Recommended)
**PostgreSQL (Docker) + Backend (Native) + Frontend (Auto-started)**

```bash
# Clone and start everything
git clone https://github.com/hihenen/mcp-orch.git
cd mcp-orch
./scripts/quickstart.sh
```

✅ **Perfect for development**
- All services ready instantly
- Frontend automatically available at http://localhost:3000
- Optimal MCP server compatibility
- Easy debugging and troubleshooting

### 🐳 Option 2: Full Docker (Production)  
**Complete containerized environment**

```bash
# Clone and deploy to production
git clone https://github.com/hihenen/mcp-orch.git
cd mcp-orch
docker compose up -d
```

✅ **Perfect for production**
- Complete containerization
- EC2/VPS ready deployment
- Consistent across environments
- Easy scaling

### 🔧 Option 3: Component-Based Development (New!)
**Individual component control for advanced development**

```bash
# Clone the repository
git clone https://github.com/hihenen/mcp-orch.git
cd mcp-orch

# Start services individually (recommended for development)
./scripts/database.sh        # PostgreSQL database
./scripts/backend.sh          # Python backend (native)
./scripts/frontend.sh         # Frontend (Docker with --no-deps)

# Check all services status
./scripts/status.sh
```

✅ **Perfect for component development**
- Granular control over each service
- Mix Docker and native execution
- Independent service management
- Advanced debugging capabilities

## What You Get

- **🌐 Web Dashboard**: `http://localhost:3000` - Intuitive project and team management
- **🔧 Backend API**: `http://localhost:8000` - Secure MCP server orchestration
- **📊 Project URLs**: `http://localhost:8000/projects/{project-id}/sse` - Direct AI tool integration
- **👥 Team Collaboration**: Real-time member management and activity tracking

## Usage

### 🚀 Quick Development Scripts (Recommended)

Our improved scripts provide the easiest way to manage MCP Orchestrator:

#### Individual Service Management
```bash
# Start database (PostgreSQL)
./scripts/database.sh              # Start PostgreSQL
./scripts/database.sh --migrate    # Run database migrations
./scripts/database.sh --psql       # Connect to PostgreSQL console
./scripts/database.sh --logs       # View PostgreSQL logs
./scripts/database.sh --stop       # Stop PostgreSQL

# Start backend (Python or Docker)
./scripts/backend.sh               # Python native (recommended)
./scripts/backend.sh --docker      # Docker mode (with limitations)
./scripts/backend.sh --help        # Show usage options

# Start frontend (Docker or Node.js)
./scripts/frontend.sh              # Docker mode (recommended)
./scripts/frontend.sh --dev        # Local Node.js mode
./scripts/frontend.sh --rebuild    # Rebuild Docker image
./scripts/frontend.sh --help       # Show usage options

# Check system status
./scripts/status.sh                # Full status dashboard
./scripts/status.sh --quick        # Quick status check
./scripts/status.sh --health       # Health check with diagnostics
./scripts/status.sh --ports        # Port usage information
```

#### Common Development Workflows
```bash
# Start full development environment
./scripts/database.sh && ./scripts/backend.sh && ./scripts/frontend.sh

# Check if everything is running
./scripts/status.sh

# Quick restart frontend after changes
./scripts/frontend.sh --rebuild

# Reset database and restart
./scripts/database.sh --reset
./scripts/backend.sh
```

### 🔧 Manual Server Management

For advanced users who prefer direct control:

```bash
# Default run (port 8000)
uv run mcp-orch serve

# Specify port
uv run mcp-orch serve --port 3000

# Specify host
uv run mcp-orch serve --host 127.0.0.1 --port 8080

# Set log level
uv run mcp-orch serve --log-level DEBUG
```

### 📋 Check Tools and Servers

```bash
# List configured servers
uv run mcp-orch list-servers

# List available tools
uv run mcp-orch list-tools
```

## 🏛️ From MCP Chaos to Enterprise Orchestra

### The Enterprise Challenge: Scattered MCP Infrastructure

**Before Git had centralized platforms, code was scattered everywhere. Before MCP had Orchestrator, your AI infrastructure is scattered too:**

```
🗂️ Team A: GitHub MCP running on localhost:3001
🗂️ Team B: Slack MCP on some EC2 instance  
🗂️ Team C: Notion MCP in a Docker container somewhere
🗂️ IT Security: "How many AI endpoints do we even have?"
```

**Sound familiar?** This is exactly where Git repositories were before centralized platforms organized everything.

### 🎯 The MCP Hub: Your Centralized Control Center

**Just like centralized Git platforms revolutionized code collaboration, MCP Orchestrator revolutionizes AI infrastructure management.**

Think of it as your **"central platform for MCP servers"** with two powerful operating modes:

#### 🔰 Individual Repository Mode
**Like managing individual Git repos - perfect for starting safe:**
```json
{
  "github-server-sse": {
    "type": "sse",
    "url": "http://localhost:8000/projects/abc123/servers/github/sse",
    "headers": { "Authorization": "Bearer your-token" }
  },
  "slack-server-streamable": {
    "type": "streamable-http", 
    "url": "http://localhost:8000/projects/abc123/servers/slack/mcp",
    "headers": { "Authorization": "Bearer your-token" }
  }
}
```
✅ **Granular control** - Each MCP server managed like individual repos  
✅ **Security isolation** - Server-specific access policies like private repos  
✅ **Easy migration** - Gradual adoption across teams (like Git adoption)

#### 🚀 Organization-Wide Mode  
**Like GitHub Organizations - when you're ready to scale:**
```json
{
  "enterprise-workspace": {
    "url": "http://localhost:8000/projects/abc123/unified/sse",
    "auth": "Bearer your-unified-token"
    // One endpoint, unlimited servers, zero config overhead
  }
}
```
✅ **Namespace magic** - `github.search()`, `slack.send()`, `notion.create()` (like repo namespaces)  
✅ **Automatic scaling** - Add servers without client updates (like adding repos to organizations)  
✅ **Enterprise governance** - Centralized policies and monitoring (like enterprise Git platforms)

### 🛡️ Enterprise Security by Design

#### Secure MCP Architecture
```
🏢 Traditional: N servers = N security policies = multiple management points
🎯 MCP-Orch: 1 control plane = unified security model = simplified management

✅ Centralized access control and audit trails
✅ Real-time compliance monitoring  
✅ Automated security policy enforcement
✅ Complete visibility across your MCP ecosystem
```

#### Benefits of MCP Centralization
```
Without MCP-Orch:
• Multiple individual server setups and maintenance
• Distributed security policies and management
• Manual monitoring and compliance tracking

With MCP-Orch:
• Centralized setup and configuration
• Unified infrastructure visibility
• Streamlined compliance and governance
• Significant reduction in management overhead
```

### 🚀 Migration Safety Net

**Start Safe, Scale Smart - Your Choice:**

1. **🔰 Begin**: Individual servers with full control
2. **📈 Evolve**: Mix individual and unified as teams grow
3. **🏛️ Scale**: Enterprise-wide unified orchestration
4. **♾️ Govern**: Multi-tenant global MCP governance

**This evolutionary approach allows gradual adoption and scaling.**

## Secure AI Tool Integration

### 🔐 Project-Based Security System

MCP Orchestrator uses **project-specific API keys** for secure access control. Each project generates its own secure endpoint with Bearer token authentication.

### 📱 Web UI Configuration

1. **Create a Project**: Access the web interface at `http://localhost:3000`
2. **Add MCP Servers**: Use the intuitive UI to configure servers
3. **Generate API Keys**: Get project-specific secure endpoints
4. **Invite Team Members**: Share access with role-based permissions

### 🔧 AI Tool Configuration

After setting up your project in the web UI, you'll get secure endpoints for both connection types:

#### 📡 SSE Connection (Traditional)
**Widely supported by all MCP clients:**
```json
{
  "mcp-orchestrator-sse": {
    "disabled": false,
    "timeout": 60,
    "type": "sse",
    "url": "http://localhost:8000/projects/c41aa472-15c3-4336-bcf8-21b464253d62/servers/brave-search/sse",
    "headers": {
      "Authorization": "Bearer project_7xXZb_tq_QreIJ3CB2wvWRpklyOmsGSGy1BeByTYe2Ia",
      "Content-Type": "application/json"
    }
  }
}
```

#### ⚡ Streamable HTTP Connection (Modern)
**Optimized for Claude Code and modern MCP clients:**
```json
{
  "mcp-orchestrator-streamable": {
    "disabled": false,
    "timeout": 60,
    "type": "streamable-http",
    "url": "http://localhost:8000/projects/c41aa472-15c3-4336-bcf8-21b464253d62/servers/brave-search/mcp",
    "headers": {
      "Authorization": "Bearer project_7xXZb_tq_QreIJ3CB2wvWRpklyOmsGSGy1BeByTYe2Ia",
      "Content-Type": "application/json"
    }
  }
}
```

### 🎯 Multiple Server Access

Configure multiple servers through a single secure endpoint:

```json
{
  "my-workspace": {
    "disabled": false,
    "timeout": 60,
    "type": "sse", 
    "url": "http://localhost:8000/projects/your-project-id/unified/sse",
    "headers": {
      "Authorization": "Bearer your-project-api-key",
      "Content-Type": "application/json"
    }
  }
}
```

### 🔗 Connection Method Comparison

**Choose the right transport for your use case:**

| Feature | SSE (Traditional) | Streamable HTTP (Modern) |
|---------|------------------|--------------------------|
| **Compatibility** | ✅ All MCP clients | ✅ Claude Code optimized |
| **Performance** | ⭐⭐⭐ Good | ⭐⭐⭐⭐ Excellent |
| **Reliability** | ⭐⭐⭐⭐ Very stable | ⭐⭐⭐⭐ Very stable |
| **Use Case** | Broad compatibility | Modern performance |
| **Endpoint** | `/sse` | `/mcp` |

**💡 Recommendation**: Start with SSE for maximum compatibility, switch to Streamable HTTP for enhanced performance with Claude Code.

### 🔒 Security Features

- **🔑 Individual API Keys**: Each project has unique authentication tokens
- **👥 Team Access Control**: Invite members, set roles (Admin, Member, Viewer)
- **📊 Activity Tracking**: Monitor who accessed what servers and when
- **🔄 Key Rotation**: Regenerate API keys anytime for enhanced security
- **⚡ Server On/Off**: Enable/disable servers per project with real-time updates

## Configuration File Format

The `mcp-config.json` file follows this format:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "command-to-run",
      "args": ["arg1", "arg2"],
      "env": {
        "ENV_VAR": "value"
      },
      "disabled": false,
      "timeout": 30
    }
  }
}
```

### Configuration Options

- `command`: Command to execute (required)
- `args`: Array of command arguments (optional)
- `env`: Environment variables (optional)
- `disabled`: Disable server (optional, default: false)
- `timeout`: Connection timeout in seconds (optional, default: 30)

## Architecture

```
┌─────────────────┐   HTTPS/SSE   ┌──────────────────┐
│   AI Tools      │ ◄────────────► │   Web Interface  │
│ (Cursor, Cline) │   +JWT Auth    │  (React/Next.js) │
└─────────────────┘                └──────────────────┘
         │                                    │
         │ Project-based                      │ Team Management
         │ Secure Endpoints                   │ Real-time Updates
         │                                    │
         ▼                                    ▼
┌─────────────────────────────────────────────────────────┐
│              MCP Orchestrator Core                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Project   │  │    Team     │  │  Activity   │     │
│  │  Manager    │  │  Manager    │  │   Logger    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │    API      │  │   Server    │  │   Access    │     │
│  │   Gateway   │  │  Registry   │  │  Control    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
         │
         │ stdio/subprocess
         ▼
┌─────────────────┐
│   MCP Servers   │
│ (GitHub, Slack, │
│  Notion, etc.)  │
└─────────────────┘
```

## 🚀 Production Deployment

Ready to deploy MCP Orchestrator to production? Follow our comprehensive deployment guide.

### 📋 Quick Deployment Checklist

Before deploying to production, ensure you have:

- [ ] **Domain & SSL**: Your domain with valid SSL certificates
- [ ] **Database**: Production PostgreSQL server (AWS RDS, Google Cloud SQL, etc.)
- [ ] **Server**: VPS, EC2, or container hosting platform
- [ ] **Security**: Firewall rules and security groups configured

### 🌐 Domain Configuration

**Required**: Replace localhost URLs with your production domains:

```bash
# In your .env file:
NEXTAUTH_URL=https://your-domain.com
NEXT_PUBLIC_MCP_API_URL=https://api.your-domain.com
MCP_SERVER_BASE_URL=https://api.your-domain.com
```

**Examples:**
- Main app: `https://mcp.company.com`
- API: `https://api.mcp.company.com`
- Subdirectory: `https://company.com/mcp` and `https://company.com/api`

### 🔐 Security Configuration

**Critical**: Generate production secrets:

```bash
# Generate secure secrets
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 32  # For NEXTAUTH_SECRET
python3 -c "import secrets; print(secrets.token_urlsafe(32))"  # For MCP_ENCRYPTION_KEY
```

Set in your `.env`:
```bash
JWT_SECRET=your-generated-jwt-secret
NEXTAUTH_SECRET=your-generated-nextauth-secret
MCP_ENCRYPTION_KEY=your-generated-encryption-key
NODE_ENV=production
ENV=production
```

### 🗄️ Database Setup

**Required**: Configure production database:

```bash
# AWS RDS example:
DATABASE_URL=postgresql+asyncpg://admin:password@your-db.cluster-xxx.us-east-1.rds.amazonaws.com:5432/mcp_orch

# Google Cloud SQL example:
DATABASE_URL=postgresql+asyncpg://user:password@xxx.xxx.xxx.xxx:5432/mcp_orch

# Always use +asyncpg for async support
```

### 🚀 Deploy with Docker

**Recommended**: Use Docker Compose for production:

```bash
# 1. Clone repository
git clone https://github.com/hihenen/mcp-orch.git
cd mcp-orch

# 2. Configure environment
cp .env.hybrid.example .env
# Edit .env with your production settings

# 3. Deploy
docker compose up -d

# 4. Verify deployment
curl https://api.your-domain.com/health
```

### 🌐 Nginx Configuration

**Example** reverse proxy setup:

```nginx
# Frontend (your-domain.com)
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.pem;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# API (api.your-domain.com)
server {
    listen 443 ssl;
    server_name api.your-domain.com;
    
    ssl_certificate /path/to/certificate.pem;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 📖 Complete Deployment Guide

For detailed step-by-step instructions, security considerations, and troubleshooting:

**[📚 View Complete Production Deployment Guide →](./docs/PRODUCTION_DEPLOYMENT.md)**

This comprehensive guide includes:
- Detailed configuration checklists
- Database migration steps
- SSL/TLS setup instructions
- Monitoring and maintenance
- Common deployment issues and solutions

## Development

### 🚀 Development Quick Start

Perfect for developers who want to work on individual services with hot reload:

#### **Option 1: Full Development Setup**
```bash
# Start all services for development
git clone https://github.com/hihenen/mcp-orch.git
cd mcp-orch
./scripts/quickstart.sh  # Complete setup with auto-start
```

#### **Option 2: Individual Service Development**

**Database Only**
```bash
./scripts/dev-database.sh    # Start PostgreSQL only
```

**Backend Only (with Hot Reload)**
```bash
./scripts/dev-backend.sh     # Python backend with --reload
```

**Frontend Only (with Hot Reload)**
```bash
./scripts/dev-frontend.sh    # Next.js with hot reload
```

**Monitor All Logs**
```bash
./scripts/logs.sh           # Unified log monitoring
./scripts/logs.sh backend   # Backend logs only
./scripts/logs.sh frontend  # Frontend logs only
./scripts/logs.sh database  # PostgreSQL logs only
```

### 🔧 Development Commands

| Command | Description |
|---------|-------------|
| `./scripts/dev-database.sh` | Start PostgreSQL container only |
| `./scripts/dev-backend.sh` | Run backend with hot reload & debug logs |
| `./scripts/dev-frontend.sh` | Run frontend with hot reload (pnpm dev) |
| `./scripts/logs.sh` | Monitor all service logs in real-time |
| `./scripts/restart-backend.sh` | Quick backend restart with git pull |

### 🐛 Quick Troubleshooting

**Database Connection Issues**
```bash
# Check PostgreSQL status
./scripts/dev-database.sh

# Verify connection
docker exec mcp-orch-postgres pg_isready -U mcp_orch -d mcp_orch
```

**Backend Not Starting**
```bash
# Check environment
cat .env | grep DATABASE_URL

# Run with debug logs
./scripts/dev-backend.sh
```

**Frontend Build Issues**
```bash
# Clean install
cd web && pnpm install --force

# Check backend connection
curl http://localhost:8000/health
```

### Project Structure

```
mcp-orch/
├── src/mcp_orch/
│   ├── api/                 # FastAPI routes and endpoints
│   ├── models/              # SQLAlchemy database models
│   ├── services/            # Business logic services
│   ├── core/               # Core MCP orchestration
│   └── cli.py              # CLI interface
├── web/                    # Next.js frontend
│   ├── src/app/            # App Router pages
│   ├── src/components/     # React components
│   └── src/stores/         # Zustand state management
├── scripts/               # Development and deployment scripts
├── migrations/            # Alembic database migrations
└── docs/                  # Documentation
```

### Testing

```bash
# Health check
curl http://localhost:8000/health

# API documentation
open http://localhost:8000/docs

# Test MCP connection
uv run mcp-orch list-servers
uv run mcp-orch list-tools
```

## Backend Restart Guide

### Quick Restart (Recommended)

For development and production environments where you need to restart only the backend service:

```bash
# 1. Stop backend processes
./scripts/restart-backend.sh

# Or manual process:
# 1. Stop current backend
./scripts/shutdown.sh processes-only

# 2. Update code  
git pull origin main

# 3. Restart with logs
nohup uv run mcp-orch serve > "logs/mcp-orch-$(date +%Y%m%d).log" 2>&1 &
```

### Manual Process

#### 1. Stop Backend Processes
```bash
# Find MCP backend processes
ps aux | grep "mcp-orch serve"

# Stop by PID
kill <PID>

# Or force stop all Python processes (use with caution)
killall -9 python
```

#### 2. Update Code
```bash
cd /path/to/mcp-orch
git pull origin main
```

#### 3. Restart Backend
```bash
# Create logs directory if it doesn't exist
mkdir -p logs

# Start with date-based logging
nohup uv run mcp-orch serve > "logs/mcp-orch-$(date +%Y%m%d).log" 2>&1 &

# Verify startup
tail -f logs/mcp-orch-$(date +%Y%m%d).log
```

#### 4. Verify Restart
```bash
# Check process is running
ps aux | grep "mcp-orch serve"

# Check API response
curl http://localhost:8000/health

# Monitor logs
tail -f logs/mcp-orch-$(date +%Y%m%d).log
```

### When to Use Backend Restart

- **Code Updates**: After `git pull` to apply new features or fixes
- **Configuration Changes**: After modifying `.env` files
- **Memory Issues**: If backend becomes unresponsive
- **Admin Privileges**: After updating `INITIAL_ADMIN_EMAIL` settings
- **Database Schema**: After running migrations

### Notes

- **Frontend Unchanged**: Only restart backend; Docker frontend container continues running
- **Database Unaffected**: PostgreSQL container remains active
- **Session Persistence**: Active MCP sessions will be terminated and need reconnection
- **Zero Frontend Downtime**: Web UI remains accessible during backend restart

## Troubleshooting

### Common Issues

1. **Server Connection Failed**
   - Verify MCP server commands are correct
   - Check if required environment variables are set
   - Use `uv run mcp-orch list-servers` to check status

2. **Not Recognized by Cline**
   - Verify URL is correct (`/servers/{server-name}/sse`)
   - Check if server is running
   - Verify CORS settings

3. **Tool Call Failed**
   - Check tool list with `uv run mcp-orch list-tools`
   - Set log level to DEBUG for detailed logs

## Configuration

### Environment Variables

Both deployment options use `.env` files for configuration:

### Key Environment Variables
```bash
# Security (Change in production!)
AUTH_SECRET=your-strong-secret-key
JWT_SECRET=your-jwt-secret-key

# MCP Data Encryption (CRITICAL)
MCP_ENCRYPTION_KEY=your-secure-encryption-key

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/mcp_orch

# Admin Account
INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=your-secure-password
```

### 🔐 MCP Encryption Key Management

**Critical Security Component**: The `MCP_ENCRYPTION_KEY` is used to encrypt MCP server arguments and environment variables stored in the database.

#### Automatic Setup
- **New Installations**: The quickstart script automatically generates a secure encryption key
- **Existing Installations**: Missing keys are detected and generated automatically

#### Manual Setup
```bash
# Generate a new encryption key
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Add to your .env file
echo "MCP_ENCRYPTION_KEY=<your-generated-key>" >> .env
```

#### Important Security Notes
⚠️ **Critical Warning**: If you lose this key, encrypted server data cannot be recovered!

✅ **Best Practices**:
- **Backup the key** securely before production deployment
- **Use the same key** across all environments for the same database
- **Never commit** the key to version control
- **Rotate periodically** in production environments
- **Store securely** using secrets management systems in production

#### Production Deployment
```bash
# Use environment variables in production
export MCP_ENCRYPTION_KEY="your-production-key-from-secrets-manager"

# Or configure in your container orchestration
# Kubernetes secret, Docker secrets, AWS Parameter Store, etc.
```

### Service Management

```bash
# Stop all services (recommended)
./scripts/shutdown.sh

# Stop services with options
./scripts/shutdown.sh --force        # Force shutdown without prompts
./scripts/shutdown.sh --docker-only  # Docker containers only
./scripts/shutdown.sh --help         # Show all options

# Manual shutdown (alternative)
docker compose down                  # For production deployment
kill $(pgrep -f "mcp-orch serve")   # For local development backend

# View logs
docker compose logs -f
docker logs mcp-orch-postgres

# Health check
./scripts/health-check.sh
```

## 🔄 Update & Upgrade

### Quick Update (Recommended)

```bash
# 1. Stop services
./scripts/shutdown.sh

# 2. Update codebase
git pull origin main

# 3. Restart services
./scripts/quickstart.sh

# 4. Start backend (for quickstart mode)
uv run mcp-orch serve --log-level INFO
```

### Detailed Update Process

```bash
# 1. Backup database (production environments)
pg_dump mcp_orch > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Stop all services
./scripts/shutdown.sh

# 3. Update repository
git pull origin main

# 4. Check for new dependencies
uv sync

# 5. Run database migrations (if needed)
uv run alembic upgrade head

# 6. Restart services
./scripts/quickstart.sh

# 7. Start backend (for quickstart mode)
uv run mcp-orch serve --log-level INFO
```

### Container-Only Update (Production)

```bash
# 1. Update codebase
git pull origin main

# 2. Rebuild and restart containers
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Environment Configuration Updates

After updating environment variables in `.env`:

```bash
# Restart backend only (quickstart mode)
kill $(pgrep -f "mcp-orch serve") 2>/dev/null || true
uv run mcp-orch serve --log-level INFO &

# Or restart all services
./scripts/shutdown.sh && ./scripts/quickstart.sh
```

### Version-Specific Updates

- Check [CHANGELOG.md](./CHANGELOG.md) for breaking changes and specific upgrade instructions
- Review migration notes for database schema changes
- Update environment variables as needed

### Rollback (If needed)

```bash
# 1. Stop services
./scripts/shutdown.sh

# 2. Rollback to previous version
git checkout <previous-tag-or-commit>

# 3. Restore database backup (if needed)
psql mcp_orch < backup_YYYYMMDD_HHMMSS.sql

# 4. Restart services
./scripts/quickstart.sh
```

## 📋 License and Contributing

### 🏛️ Project Governance
**MCP Orchestrator** is created and maintained by **henen** (yss1530@naver.com) as the original creator and copyright holder.

### 📄 Current License
- **License**: MIT License (see [LICENSE.md](./LICENSE.md))
- **Commercial Rights**: Reserved by project maintainer
- **Future Licensing**: Subject to change at maintainer's discretion

### 🤝 Contributing
We welcome contributions from the community! Before contributing:

1. **📖 Read our guides**:
   - [CONTRIBUTING.md](./CONTRIBUTING.md) - How to contribute
   - [CLA.md](./CLA.md) - Contributor License Agreement
   - [COPYRIGHT-POLICY.md](./COPYRIGHT-POLICY.md) - Project policies

2. **✍️ Sign the CLA**: All contributions require copyright assignment via our Contributor License Agreement

3. **🚀 Start contributing**: 
   - Report bugs and request features
   - Submit pull requests
   - Improve documentation
   - Help with testing

### 🌟 Contributors
See [CONTRIBUTORS.md](./CONTRIBUTORS.md) for a list of all project contributors.

### 📞 Contact
- **Issues**: GitHub Issues for bugs and features
- **Discussions**: GitHub Discussions for questions
- **Security**: yss1530@naver.com for security-related issues
- **Licensing**: yss1530@naver.com for licensing questions
- **Development**: next.js@kakao.com for development and technical discussions

---

## 👨‍💻 About the Creator

**henen** - Based in Seoul, Korea 🇰🇷

I'm a passionate developer from Seoul who created MCP Orchestrator to solve real-world MCP server management challenges. As a Korean developer working in the AI/LLM space, I believe in building tools that bridge different communities and technologies.

### 🎵 Built with Vibe Coding & AI Partnership

This project was crafted with **vibe coding** - that magical flow state where coffee meets creativity and code just... happens ☕✨. But let's be honest, I couldn't have done it without my coding buddy **Claude Code**! 🤖

*Big shoutout to Claude Code for being the ultimate pair programming partner - turning my midnight brainstorms into actual working software. From debugging mysterious errors to suggesting elegant solutions, it's like having a 24/7 senior developer who never judges your variable names (looking at you, `thing2` and `tempStuff`) 😅*

**The vibe was immaculate, the code flows freely, and together we built something pretty cool!** 🚀

### 🌱 Early Version - Let's Grow Together!

This is still an **early-stage project** (think "lovingly crafted MVP with big dreams"), so I'm actively looking for collaborators who want to help shape the future of MCP server management! 

**What we need:**
- 🐛 **Bug hunters** - Find those sneaky edge cases I missed
- 💡 **Feature visionaries** - Got ideas? Share them!
- 📝 **Documentation heroes** - Help make guides even clearer
- 🧪 **Beta testers** - Try it, break it, tell me what happened
- 🎨 **UX improvers** - Make it prettier and more intuitive

**No contribution too small!** Whether you're fixing a typo, suggesting a feature, or just opening an issue to say "this confused me" - it all helps make MCP Orchestrator better for everyone. 

*Plus, early contributors get eternal bragging rights for being here before it was cool* 😎

### 🌏 Open for Collaboration
I'm always interested in connecting with developers, companies, and organizations worldwide:
- **Side Projects & Consulting** - Open to interesting opportunities
- **International Partnerships** - Love working with global teams
- **Technical Discussions** - Happy to share knowledge and learn from others
- **GPT-Assisted Communication** - Don't worry about language barriers! I use AI translation tools for smooth international collaboration

### 🚀 Let's Build Together
Whether you're looking for:
- Custom MCP solutions
- Enterprise consulting
- Open source collaboration
- Technical mentorship
- Just want to chat about AI/MCP technology

Feel free to reach out! I'm particularly excited about projects that advance the MCP ecosystem and help developers build better AI applications.

**Contact**: yss1530@naver.com | next.js@kakao.com

📋 **[See COLLABORATION.md for detailed partnership opportunities →](./COLLABORATION.md)**

---

## 🎯 Project Vision

MCP Orchestrator aims to become the leading open-source platform for Model Context Protocol server management. We're building enterprise-grade infrastructure with:

- 🏗️ **Production-ready deployment** capabilities
- 🔐 **Security-first approach** with encryption and access controls  
- 🌐 **Scalable architecture** for multi-tenant environments
- 🛠️ **Developer-friendly tools** for MCP integration
- 📊 **Comprehensive monitoring** and analytics

### 🚀 Commercial Opportunities
While maintaining our open-source commitment, we're exploring sustainable business models including:
- Enterprise support and consulting
- Hosted SaaS solutions
- Premium features for commercial use
- Custom development services

---

*Join us in building the future of Model Context Protocol orchestration!*