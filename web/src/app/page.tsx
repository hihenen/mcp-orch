'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  FolderOpen, 
  Users, 
  Server, 
  Calendar,
  MoreHorizontal,
  Settings,
  Trash2,
  ChevronDown,
  LogIn,
  UserPlus,
  Zap,
  Wrench,
  X,
  Download,
  Github
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useTeamStore } from '@/stores/teamStore';
import { Project } from '@/types/project';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/date-utils';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const { 
    projects, 
    loadProjects, 
    createProject, 
    deleteProject,
    isLoading 
  } = useProjectStore();
  
  const { 
    userTeams: teams, 
    loadUserTeams: loadTeams 
  } = useTeamStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    team_id: ''
  });

  // Check login status
  useEffect(() => {
    if (status === 'loading') return; // Wait if loading
    
    // Load projects and teams only when logged in
    if (status === 'authenticated') {
      loadProjects();
      loadTeams();
    }
  }, [status, loadProjects, loadTeams]);

  // Show landing page for unauthenticated users
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-white">
        {/* Problem Hero Section */}
        <section className="min-h-screen flex items-center px-6">
          <div className="w-full max-w-7xl mx-auto">
            {/* Main headline */}
            <h1 className="text-5xl md:text-7xl font-bold text-center mb-16">
              Open Source MCP
              <span className="block text-blue-600 mt-4">Server Orchestration</span>
            </h1>
            <p className="text-xl text-gray-600 text-center mb-16 max-w-3xl mx-auto">
              Deploy anywhere, manage everywhere. Self-hosted MCP server management with 
              project-based team collaboration. No vendor lock-in, full control.
            </p>

            {/* Problem visualization */}
            <div className="max-w-6xl mx-auto mb-16">
              <div className="grid md:grid-cols-3 gap-8">
                {/* Problem 1: Scattered Servers */}
                <div className="text-center">
                  <div className="mb-4 relative">
                    <div className="w-32 h-32 mx-auto bg-red-50 rounded-lg border-2 border-red-200 flex items-center justify-center">
                      <div className="space-y-2">
                        <div className="w-4 h-4 bg-red-400 rounded-full mx-auto"></div>
                        <div className="w-6 h-4 bg-red-400 rounded mx-auto"></div>
                        <div className="w-5 h-4 bg-red-400 rounded mx-auto"></div>
                        <div className="text-xs text-red-600 font-mono">scattered</div>
                      </div>
                    </div>
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      Pain Point
                    </span>
                  </div>
                  <h3 className="font-semibold mb-2 text-lg">Scattered Servers</h3>
                  <p className="text-gray-600 text-sm">
                    MCP servers spread across different projects and repositories
                  </p>
                </div>

                {/* Problem 2: No Team Sync */}
                <div className="text-center">
                  <div className="mb-4 relative">
                    <div className="w-32 h-32 mx-auto bg-orange-50 rounded-lg border-2 border-orange-200 flex items-center justify-center">
                      <div className="space-y-2">
                        <Users className="w-8 h-8 text-orange-400 mx-auto" />
                        <div className="w-8 h-0.5 bg-orange-400 mx-auto relative">
                          <div className="absolute inset-0 bg-orange-400 animate-pulse"></div>
                          <X className="w-4 h-4 text-red-500 absolute -top-2 left-1/2 transform -translate-x-1/2" />
                        </div>
                        <div className="text-xs text-orange-600 font-mono">isolated</div>
                      </div>
                    </div>
                    <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                      Pain Point
                    </span>
                  </div>
                  <h3 className="font-semibold mb-2 text-lg">No Team Sync</h3>
                  <p className="text-gray-600 text-sm">
                    Can't share server configs or collaborate with team members
                  </p>
                </div>

                {/* Problem 3: Manual Setup */}
                <div className="text-center">
                  <div className="mb-4 relative">
                    <div className="w-32 h-32 mx-auto bg-yellow-50 rounded-lg border-2 border-yellow-200 flex items-center justify-center">
                      <div className="space-y-2">
                        <Settings className="w-8 h-8 text-yellow-400 mx-auto animate-spin" />
                        <div className="flex space-x-1 justify-center">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <div className="text-xs text-yellow-600 font-mono">repetitive</div>
                      </div>
                    </div>
                    <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                      Pain Point
                    </span>
                  </div>
                  <h3 className="font-semibold mb-2 text-lg">Manual Setup Hell</h3>
                  <p className="text-gray-600 text-sm">
                    Repetitive configuration for every new project
                  </p>
                </div>
              </div>
            </div>

            {/* Code example showing the problem */}
            <div className="max-w-4xl mx-auto mb-16">
              <p className="text-center text-gray-500 mb-6 text-lg">Sound familiar?</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-900 text-gray-300 p-6 rounded-lg text-sm font-mono">
                  <div className="text-gray-500 mb-3 text-xs"># Project A - cline_mcp_settings.json</div>
                  <pre>{`{
  "mcpServers": {
    "github": {
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"]
    },
    "slack": {
      "transport": "stdio", 
      "command": "node",
      "args": ["./slack-server.js"]
    }
  }
}`}</pre>
                </div>
                <div className="bg-gray-900 text-gray-300 p-6 rounded-lg text-sm font-mono">
                  <div className="text-gray-500 mb-3 text-xs"># Project B - cline_mcp_settings.json</div>
                  <pre>{`{
  "mcpServers": {
    "github": {
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"]
    },
    "notion": {
      "transport": "stdio",
      "command": "./notion-server"
    }
    // Where's slack? Copy-paste again?
  }
}`}</pre>
                </div>
              </div>
            </div>

            {/* Scroll indicator */}
            <div className="text-center">
              <p className="text-gray-500 mb-4 text-lg">There's a better way</p>
              <ChevronDown className="w-6 h-6 mx-auto animate-bounce text-gray-400" />
            </div>
          </div>
        </section>

        {/* Solution Section */}
        <section className="min-h-screen flex items-center border-t px-6">
          <div className="w-full max-w-7xl mx-auto">
            {/* Solution headline */}
            <h2 className="text-5xl md:text-7xl font-bold text-center mb-8">
              One platform.
              <span className="block mt-4">All your MCP servers.</span>
              <span className="block text-blue-600 mt-4">Perfectly orchestrated.</span>
            </h2>

            <p className="text-xl text-center text-gray-600 mb-16 max-w-3xl mx-auto">
              MCP Orchestrator centralizes your server management, enables team collaboration, 
              and automates configuration across all your AI projects.
            </p>

            {/* Before/After comparison */}
            <div className="max-w-6xl mx-auto mb-16">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Before */}
                <div className="relative">
                  <div className="absolute -top-4 left-4 bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-medium">
                    Before
                  </div>
                  <div className="border-2 border-gray-300 rounded-lg p-6 opacity-60 bg-gray-50">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-gray-500">
                        <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <span className="line-through">Manual config per project</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-500">
                        <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <span className="line-through">No team visibility</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-500">
                        <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <span className="line-through">Scattered server configs</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-500">
                        <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <span className="line-through">Duplicate setup work</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* After */}
                <div className="relative">
                  <div className="absolute -top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium">
                    With MCP Orchestrator
                  </div>
                  <div className="border-2 border-blue-600 rounded-lg p-6 bg-blue-50">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <span className="font-medium">Centralized configuration</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <span className="font-medium">Real-time team collaboration</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <span className="font-medium">One-click integration</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <span className="font-medium">Automatic server discovery</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Solution code example */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-black text-white p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-green-400 text-sm font-medium">✓ All projects now use shared configuration</span>
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                </div>
                <pre className="text-sm font-mono">{`# One command to rule them all
$ mcp-orch init my-workspace
✓ Workspace created
✓ Team members invited
✓ Server configurations synced

# Automatic configuration for all tools
$ cat ~/.config/cline/mcp_settings.json
{
  "mcpServers": {
    "my-workspace": {
      "transport": "sse",
      "url": "https://api.mcp-orch.dev/workspace/abc123/sse",
      "headers": {
        "Authorization": "Bearer mcp_proj_..."
      }
    }
  }
}`}</pre>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="text-center mt-16">
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/auth/signup">
                  <Button size="lg" className="h-12 px-8 text-lg w-full sm:w-auto">
                    Start Building for Free →
                  </Button>
                </Link>
                <Link href="/auth/signin">
                  <Button size="lg" variant="outline" className="h-12 px-8 text-lg w-full sm:w-auto">
                    Sign In
                  </Button>
                </Link>
              </div>
              <p className="mt-6 text-sm text-gray-500">
                No credit card required • 5-minute setup • Works with Cursor, Cline, Claude
              </p>
            </div>
          </div>
        </section>

        {/* Features Grid Section */}
        <section className="py-24 border-t px-6">
          <div className="w-full max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Built for modern AI development teams
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Everything you need to manage MCP servers at scale, from individual projects to enterprise teams.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1: Project-Based Architecture */}
              <div className="group p-8 rounded-lg border border-gray-200 hover:border-black transition-all duration-300 hover:shadow-lg">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <FolderOpen className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Project-Based Architecture</h3>
                  <p className="text-gray-600 mb-4">
                    Organize MCP servers by project, not by tool. Each project gets its own isolated environment 
                    with independent configurations and team access.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      <span>Isolated server environments</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      <span>Cross-team collaboration</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      <span>Granular permissions</span>
                    </div>
                  </div>
                </div>
                <a href="#" className="inline-flex items-center text-sm group-hover:underline font-medium">
                  Learn more →
                </a>
              </div>

              {/* Feature 2: Team Collaboration */}
              <div className="group p-8 rounded-lg border border-gray-200 hover:border-black transition-all duration-300 hover:shadow-lg">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Real-Time Team Sync</h3>
                  <p className="text-gray-600 mb-4">
                    Share server configurations, monitor activity, and collaborate seamlessly. 
                    Invite team members, external contractors, or cross-team collaborators.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                      <span>Live activity tracking</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                      <span>Team member invitations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                      <span>Shared configurations</span>
                    </div>
                  </div>
                </div>
                <a href="#" className="inline-flex items-center text-sm group-hover:underline font-medium">
                  Learn more →
                </a>
              </div>

              {/* Feature 3: Developer Tools Integration */}
              <div className="group p-8 rounded-lg border border-gray-200 hover:border-black transition-all duration-300 hover:shadow-lg">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <Wrench className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">One-Click Integration</h3>
                  <p className="text-gray-600 mb-4">
                    Works seamlessly with Cursor, Cline, Claude, and any MCP-compatible tool. 
                    Generate configuration files automatically.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                      <span>Auto-generated configs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                      <span>SSE endpoint support</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                      <span>JWT-based security</span>
                    </div>
                  </div>
                </div>
                <a href="#" className="inline-flex items-center text-sm group-hover:underline font-medium">
                  Learn more →
                </a>
              </div>
            </div>

            {/* Integration showcase */}
            <div className="mt-20 text-center">
              <h3 className="text-2xl font-bold mb-8">Works with your favorite tools</h3>
              <div className="flex justify-center items-center space-x-12 grayscale hover:grayscale-0 transition-all duration-300">
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🖱️</span>
                  </div>
                  <span className="text-sm font-medium">Cursor</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🤖</span>
                  </div>
                  <span className="text-sm font-medium">Cline</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🧠</span>
                  </div>
                  <span className="text-sm font-medium">Claude</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📝</span>
                  </div>
                  <span className="text-sm font-medium">VS Code</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <span className="text-sm font-medium">Any MCP Tool</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 border-t px-6 bg-gray-50">
          <div className="w-full max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Deploy once, orchestrate everywhere
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                From installation to team collaboration in 3 simple steps. Self-hosted, secure, scalable.
              </p>
            </div>

            <div className="space-y-16">
              {/* Step 1: Installation */}
              <div className="flex flex-col lg:flex-row gap-8 items-center">
                <div className="flex-shrink-0 order-2 lg:order-1">
                  <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center text-2xl font-bold">
                    1
                  </div>
                </div>
                <div className="flex-1 order-1 lg:order-2">
                  <h3 className="text-2xl font-semibold mb-4">One-Click Installation</h3>
                  <p className="text-gray-600 mb-6 text-lg">
                    Install MCP Orchestrator on your infrastructure with our intelligent installer. 
                    Choose from Minimal, Standard, or Production deployment modes.
                  </p>
                  <div className="bg-black text-white p-4 rounded-lg font-mono text-sm max-w-lg">
                    <pre>{`# Automatic installation script
$ curl -fsSL install.mcp-orch.dev | sh

? Choose deployment type:
  1) Minimal (SQLite + Local)
  2) Standard (Docker + Native)
  3) Production (External DB + Service)

✓ Dependencies installed
✓ Database configured  
✓ Services started
✓ Web UI available at http://localhost:3000`}</pre>
                  </div>
                </div>
                <div className="flex-shrink-0 order-3 lg:order-3">
                  <div className="w-64 h-48 bg-blue-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Download className="w-16 h-16 mx-auto text-blue-600 mb-2" />
                      <span className="text-blue-800 font-medium">Quick Setup</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: UI-based Server Management */}
              <div className="flex flex-col lg:flex-row gap-8 items-center">
                <div className="flex-shrink-0 order-2 lg:order-1">
                  <div className="w-64 h-48 bg-green-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Server className="w-16 h-16 mx-auto text-green-600 mb-2" />
                      <span className="text-green-800 font-medium">Web Interface</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 order-1 lg:order-2">
                  <h3 className="text-2xl font-semibold mb-4">Manage servers through Web UI</h3>
                  <p className="text-gray-600 mb-6 text-lg">
                    Add MCP servers, configure environments, and manage team permissions 
                    through our intuitive web interface. No command-line required.
                  </p>
                  <div className="bg-white border p-4 rounded-lg text-sm max-w-lg">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="font-medium">🐙 GitHub MCP</span>
                        <span className="text-green-600 text-xs">✓ Online</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="font-medium">💬 Slack MCP</span>
                        <span className="text-green-600 text-xs">✓ Online</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="font-medium">📝 Notion MCP</span>
                        <span className="text-green-600 text-xs">✓ Online</span>
                      </div>
                      <button className="w-full bg-blue-600 text-white py-2 px-4 rounded text-sm hover:bg-blue-700">
                        + Add New Server
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 order-3 lg:order-3">
                  <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center text-2xl font-bold">
                    2
                  </div>
                </div>
              </div>

              {/* Step 3: AI Tool Integration */}
              <div className="flex flex-col lg:flex-row gap-8 items-center">
                <div className="flex-shrink-0 order-2 lg:order-1">
                  <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center text-2xl font-bold">
                    3
                  </div>
                </div>
                <div className="flex-1 order-1 lg:order-2">
                  <h3 className="text-2xl font-semibold mb-4">Connect your AI tools instantly</h3>
                  <p className="text-gray-600 mb-6 text-lg">
                    Copy the auto-generated SSE endpoint to connect Cursor, Cline, or any MCP-compatible tool. 
                    Your entire team instantly accesses all configured servers.
                  </p>
                  <div className="bg-white border p-4 rounded-lg text-sm max-w-lg">
                    <div className="space-y-3">
                      <div className="text-gray-700 font-medium mb-2">📋 Your SSE Endpoint:</div>
                      <div className="bg-gray-100 p-3 rounded font-mono text-xs break-all">
                        https://your-domain.com/projects/abc123/sse
                      </div>
                      <div className="text-gray-700 font-medium mb-2">🔑 Bearer Token:</div>
                      <div className="bg-gray-100 p-3 rounded font-mono text-xs">
                        mcp_proj_abc123...
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 bg-green-600 text-white py-2 px-3 rounded text-xs">
                          Copy for Cursor
                        </button>
                        <button className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-xs">
                          Copy for Cline
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 order-3 lg:order-3">
                  <div className="w-64 h-48 bg-purple-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Zap className="w-16 h-16 mx-auto text-purple-600 mb-2" />
                      <span className="text-purple-800 font-medium">AI Integration</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Benefits */}
            <div className="mt-20 text-center">
              <h3 className="text-2xl font-bold mb-8 text-gray-900">Why teams choose MCP Orchestrator</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 bg-white rounded-lg border border-gray-200">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="font-semibold mb-2">Team Collaboration</h4>
                  <p className="text-gray-600 text-sm">Share server configurations across team members. No more copying config files manually.</p>
                </div>
                <div className="p-6 bg-white rounded-lg border border-gray-200">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Settings className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="font-semibold mb-2">Centralized Management</h4>
                  <p className="text-gray-600 text-sm">Manage all MCP servers from one dashboard. Add, remove, configure, and monitor in real-time.</p>
                </div>
                <div className="p-6 bg-white rounded-lg border border-gray-200">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Server className="w-6 h-6 text-purple-600" />
                  </div>
                  <h4 className="font-semibold mb-2">Self-Hosted Control</h4>
                  <p className="text-gray-600 text-sm">Deploy on your infrastructure. Full control over data, privacy, and security. No vendor lock-in.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Installation & Community Section */}
        <section className="py-24 border-t text-center px-6">
          <div className="w-full max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-bold mb-8">
              Ready to get started?
              <span className="block text-blue-600 mt-2">Install & Deploy in Minutes</span>
            </h2>
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
              Join the growing open source community. Install on your infrastructure, 
              customize to your needs, contribute to the future.
            </p>
            
            {/* Installation options */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="bg-gray-900 text-left p-6 rounded-lg">
                <h3 className="text-white font-semibold mb-4 flex items-center">
                  <span className="text-2xl mr-3">🚀</span>
                  One-Click Install
                </h3>
                <pre className="text-green-400 text-sm font-mono">
{`curl -fsSL install.mcp-orch.dev | sh
# or
wget -qO- install.mcp-orch.dev | sh

# Choose: Minimal, Standard, Production
# Open http://localhost:3000`}
                </pre>
              </div>
              <div className="bg-gray-900 text-left p-6 rounded-lg">
                <h3 className="text-white font-semibold mb-4 flex items-center">
                  <span className="text-2xl mr-3">🐳</span>
                  Hybrid Deploy
                </h3>
                <pre className="text-green-400 text-sm font-mono">
{`git clone https://github.com/your-org/mcp-orch
cd mcp-orch
./install.sh

# DB: Docker, Backend: Native, Frontend: Docker
# Optimal MCP server compatibility`}
                </pre>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Link href="/auth/signin">
                <Button size="lg" className="h-14 px-12 text-lg w-full sm:w-auto">
                  Access Web Interface →
                </Button>
              </Link>
              <a href="https://github.com/your-org/mcp-orch" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="h-14 px-12 text-lg w-full sm:w-auto">
                  View on GitHub
                </Button>
              </a>
            </div>
            
            <p className="text-sm text-gray-500 mb-8">
              MIT License • Self-hosted • Community Support • Enterprise Ready
            </p>

            {/* Open source stats */}
            <div className="flex justify-center items-center space-x-8 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">⭐</span>
                <span>GitHub Stars</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🔨</span>
                <span>Contributors</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">📦</span>
                <span>Docker Pulls</span>
              </div>
            </div>
            
            {/* Enterprise preview */}
            <div className="mt-16 p-8 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                🚀 Enterprise Features Coming Soon
              </h3>
              <p className="text-gray-600 mb-6">
                Need SSO, advanced monitoring, or premium support? 
                Enterprise features will be available with commercial licensing.
              </p>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>SAML/OIDC Integration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Advanced Analytics</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Priority Support</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Search filtering
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNameChange = (name: string) => {
    setNewProject(prev => ({
      ...prev,
      name
    }));
  };

  const handleCreateProject = async () => {
    try {
      // Convert "personal" value to empty string for personal project
      const projectData = {
        ...newProject,
        team_id: newProject.team_id === 'personal' ? '' : newProject.team_id
      };
      await createProject(projectData);
      setIsCreateDialogOpen(false);
      setNewProject({ name: '', description: '', team_id: '' });
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject(projectId);
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MCP Orch</h1>
          <p className="text-muted-foreground mt-1">
            Manage your projects and configure MCP servers
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a new project to manage your MCP servers.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={newProject.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Frontend Dashboard"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newProject.description}
                  onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter a brief description of your project"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="team">Team (Optional)</Label>
                <Select
                  value={newProject.team_id}
                  onValueChange={(value) => setNewProject(prev => ({ ...prev, team_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="If no team is selected, it will be created as a personal project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Create as Personal Project</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  If no team is selected, it will be created as a personal project, and you can invite members later.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateProject}
                disabled={!newProject.name}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline">
          {filteredProjects.length} projects
        </Badge>
      </div>

      {/* Project List */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Projects</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery ? 'No projects match your search criteria.' : 'Create your first project to get started.'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {project.description || 'No description'}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/projects/${project.id}`}>
                          <Settings className="h-4 w-4 mr-2" />
                          Manage Project
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {project.member_count || 1} members
                    </div>
                    <div className="flex items-center gap-1">
                      <Server className="h-4 w-4" />
                      {project.server_count || 0} servers
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(project.created_at)}
                  </div>

                  <div className="pt-2">
                    <Link href={`/projects/${project.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        Open Project
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Statistics Cards */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projects.reduce((sum, p) => sum + (p.member_count || 1), 0)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projects.reduce((sum, p) => sum + (p.server_count || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
