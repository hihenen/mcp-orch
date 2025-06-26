# MCP Orch

**MCP Proxy Compatible Server** - Serve multiple MCP servers on a single port via SSE

> **📖 [한국어 버전](./README_KOR.md)** | **🌏 English Version** | **📋 [Changelog](./CHANGELOG.md)**

## Overview

MCP Orchestrator is a comprehensive **project-based MCP server management platform** that goes beyond simple proxying. It provides secure team collaboration, web-based management, and enterprise-grade access control for Model Context Protocol servers.

**Why MCP Orchestrator?**
- 🏢 **Enterprise-Ready**: Team management, role-based access, activity monitoring
- 🔐 **Security-First**: Project-specific API keys, Bearer token authentication, access control
- 🌐 **Web Interface**: No more JSON files - manage everything through an intuitive UI
- 👥 **Team Collaboration**: Share servers, invite members, track activities in real-time

## Key Features

- **🔐 Project-Based Security**: Individual API keys per project with team-based access control
- **👥 Team Collaboration**: Real-time collaboration with role-based permissions and member management
- **🎯 Smart Server Management**: Web UI for adding, configuring, and monitoring MCP servers
- **🔄 One-Click Integration**: Auto-generated secure endpoints for Cursor, Cline, Claude, and all MCP tools
- **📊 Activity Monitoring**: Track server usage, team activities, and system performance
- **🏗️ Enterprise Ready**: Self-hosted deployment with scalable architecture
- **🔌 Full MCP Compatibility**: Standard MCP protocol with SSE transport support

## Quick Start (30 seconds!)

Choose your deployment option:

### 🎯 Option 1: Local Development (Recommended)
**PostgreSQL (Docker) + Backend (Native) + Frontend (Auto-started)**

```bash
# Clone and start everything
git clone https://github.com/fnf-ea/mcp-orch.git
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
git clone https://github.com/fnf-ea/mcp-orch.git
cd mcp-orch
docker compose up -d
```

✅ **Perfect for production**
- Complete containerization
- EC2/VPS ready deployment
- Consistent across environments
- Easy scaling

## What You Get

- **🌐 Web Dashboard**: `http://localhost:3000` - Intuitive project and team management
- **🔧 Backend API**: `http://localhost:8000` - Secure MCP server orchestration
- **📊 Project URLs**: `http://localhost:8000/projects/{project-id}/sse` - Direct AI tool integration
- **👥 Team Collaboration**: Real-time member management and activity tracking

## Usage

### Running the Server

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

### Check Tools and Servers

```bash
# List configured servers
uv run mcp-orch list-servers

# List available tools
uv run mcp-orch list-tools
```

## Secure AI Tool Integration

### 🔐 Project-Based Security System

MCP Orchestrator uses **project-specific API keys** for secure access control. Each project generates its own secure endpoint with Bearer token authentication.

### 📱 Web UI Configuration

1. **Create a Project**: Access the web interface at `http://localhost:3000`
2. **Add MCP Servers**: Use the intuitive UI to configure servers
3. **Generate API Keys**: Get project-specific secure endpoints
4. **Invite Team Members**: Share access with role-based permissions

### 🔧 AI Tool Configuration

After setting up your project in the web UI, you'll get secure endpoints like:

```json
{
  "mcp-orchestrator": {
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

### 🎯 Multiple Server Access

Configure multiple servers through a single secure endpoint:

```json
{
  "my-workspace": {
    "disabled": false,
    "timeout": 60,
    "type": "sse", 
    "url": "http://localhost:8000/projects/your-project-id/sse",
    "headers": {
      "Authorization": "Bearer your-project-api-key",
      "Content-Type": "application/json"
    }
  }
}
```

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