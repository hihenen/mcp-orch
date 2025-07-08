---
layout: default
title: MCP Orchestrator - Enterprise MCP Management
description: The ONLY Model Context Protocol solution with built-in project management and enterprise security
---

<div style="text-align: center; padding: 4rem 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; margin-bottom: 3rem;">
  <h1 style="font-size: 3rem; margin-bottom: 1rem;">MCP Orchestrator</h1>
  <p style="font-size: 1.25rem; opacity: 0.9; margin-bottom: 2rem;">The ONLY Model Context Protocol solution with built-in project management and enterprise security</p>
  
  <div>
    <a href="https://github.com/hihenen/mcp-orch" style="display: inline-block; padding: 0.75rem 2rem; margin: 0.5rem; text-decoration: none; border-radius: 5px; background: white; color: #667eea; font-weight: bold;">View on GitHub</a>
    <a href="#quick-start" style="display: inline-block; padding: 0.75rem 2rem; margin: 0.5rem; text-decoration: none; border-radius: 5px; background: transparent; color: white; border: 2px solid white; font-weight: bold;">Get Started</a>
  </div>
</div>

## 🎯 Why Choose MCP Orchestrator?

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; margin: 3rem 0;">
  <div style="padding: 2rem; border: 1px solid #e5e7eb; border-radius: 8px;">
    <h3>📁 Project-Based Management</h3>
    <p>Organize your MCP servers by projects, not just a flat list. Perfect for teams managing multiple environments.</p>
  </div>
  
  <div style="padding: 2rem; border: 1px solid #e5e7eb; border-radius: 8px;">
    <h3>👥 Built for Teams</h3>
    <p>Collaborate with your team using role-based permissions, activity tracking, and shared project spaces.</p>
  </div>
  
  <div style="padding: 2rem; border: 1px solid #e5e7eb; border-radius: 8px;">
    <h3>🔐 Enterprise Security</h3>
    <p>JWT authentication, API keys, audit logs, and project isolation. Security that scales with your organization.</p>
  </div>
  
  <div style="padding: 2rem; border: 1px solid #e5e7eb; border-radius: 8px;">
    <h3>🖥️ Professional Dashboard</h3>
    <p>Intuitive web interface with real-time monitoring, not just another CLI tool.</p>
  </div>
</div>

## 📊 See the Difference

**MCP-Orch is the ONLY solution** that combines project management, team collaboration, and enterprise security in one platform.

| Feature | MCP-Orch | Other Solutions |
|---------|-----------|-----------------|
| Project Management | ✅ Full Support | ❌ Not Available |
| Team Collaboration | ✅ Built-in | ❌ Single User |
| Enterprise Security | ✅ Complete | ⚠️ Basic Only |
| Web Dashboard | ✅ Professional UI | ⚠️ CLI or Basic |
| Production Ready | ✅ Battle-tested | ⚠️ Experimental |

## 🚀 Quick Start {#quick-start}

Get up and running in under 5 minutes:

### 🎯 Option 1: Local Development (Recommended)
```bash
# Clone and start everything
git clone https://github.com/hihenen/mcp-orch.git
cd mcp-orch
./scripts/quickstart.sh
```

### 🐳 Option 2: Full Docker (Production)
```bash
# Clone and deploy to production
git clone https://github.com/hihenen/mcp-orch.git
cd mcp-orch
docker compose up -d
```

### 🔧 Option 3: Component-Based Development
```bash
# Start services individually
./scripts/database.sh        # PostgreSQL database
./scripts/backend.sh          # Python backend
./scripts/frontend.sh         # Frontend
```

**Access your dashboard**: `http://localhost:3000`

## 🏗️ Built for Scale

<div style="text-align: center; margin: 3rem 0;">
  <h3>Modern Tech Stack</h3>
  <ul style="list-style: none; padding: 0;">
    <li><strong>Backend:</strong> FastAPI + PostgreSQL + SQLAlchemy</li>
    <li><strong>Frontend:</strong> Next.js 14 + TypeScript + Tailwind CSS</li>
    <li><strong>Auth:</strong> NextAuth.js v5 + JWT</li>
    <li><strong>Deployment:</strong> Docker + Kubernetes Ready</li>
  </ul>
</div>

## 📈 Use Cases

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin: 3rem 0;">
  <div>
    <h3>🏢 Enterprise Teams</h3>
    <p>Manage MCP servers across development, staging, and production environments with proper access control.</p>
  </div>
  <div>
    <h3>🚀 Startups</h3>
    <p>Start simple and scale as you grow. Project-based organization keeps everything clean.</p>
  </div>
  <div>
    <h3>🔬 Research Labs</h3>
    <p>Isolate experiments in different projects while maintaining central oversight.</p>
  </div>
</div>

## 🤝 Join the Community

<div style="text-align: center; margin: 3rem 0;">
  <a href="https://github.com/hihenen/mcp-orch/discussions" style="display: inline-block; margin: 1rem; padding: 1rem 2rem; text-decoration: none; background: #f8f9fa; border-radius: 8px; color: #333;">
    💬 GitHub Discussions
  </a>
  <a href="https://github.com/hihenen/mcp-orch/issues" style="display: inline-block; margin: 1rem; padding: 1rem 2rem; text-decoration: none; background: #f8f9fa; border-radius: 8px; color: #333;">
    🐛 Report Issues
  </a>
  <a href="mailto:yss1530@naver.com" style="display: inline-block; margin: 1rem; padding: 1rem 2rem; text-decoration: none; background: #f8f9fa; border-radius: 8px; color: #333;">
    📧 Contact Us
  </a>
</div>

## 📄 Open Source

MCP Orchestrator is MIT licensed and open for contributions. We welcome:

- 🐛 **Bug reports** and feature requests
- 💡 **Pull requests** with improvements
- 📝 **Documentation** enhancements
- 🧪 **Testing** and feedback

## 🌟 Ready to Get Started?

<div style="text-align: center; margin: 4rem 0; padding: 3rem; background: #f8f9fa; border-radius: 12px;">
  <h2>Ready to organize your MCP servers properly?</h2>
  <p style="margin-bottom: 2rem;">Join hundreds of developers who have streamlined their MCP management with our enterprise-grade platform.</p>
  <a href="https://github.com/hihenen/mcp-orch" style="display: inline-block; padding: 1rem 3rem; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-size: 1.2rem; font-weight: bold;">Get Started on GitHub</a>
</div>

---

<div style="text-align: center; padding: 2rem; color: #666;">
  <p>Made with ❤️ by <a href="https://github.com/hihenen">hihenen</a> | Licensed under MIT</p>
  <p>🇰🇷 Built in Seoul, Korea with the power of vibe coding and AI partnership</p>
</div>