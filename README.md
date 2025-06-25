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

### Project Structure

```
mcp-orch/
├── src/mcp_orch/
│   ├── api/                 # API server (mcp_proxy_mode.py)
│   ├── core/               # Core components (registry, adapter, controller)
│   ├── proxy/              # Proxy handlers
│   ├── cli.py              # CLI interface
│   └── config.py           # Configuration management
├── docs/                   # Documentation
├── tests/                  # Test files
└── mcp-config.json         # MCP server configuration
```

### Testing

```bash
# Test server connection
uv run python test_mcp_connection.py

# Test tool calls
uv run python test_mcp_proxy_mode.py
```

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

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/mcp_orch

# Admin Account
INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=your-secure-password
```

### Service Management

```bash
# Stop all services
docker compose down

# View logs
docker compose logs -f
docker logs mcp-orch-postgres

# Health check
./scripts/health-check.sh
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