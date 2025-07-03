'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { showDeleteConfirm } from '@/lib/dialog-utils';
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
  Github,
  Star
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 via-purple-600/20 to-cyan-600/30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.3),rgba(0,0,0,0.3))]"></div>
          <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-400 rounded-full mix-blend-screen filter blur-xl opacity-40 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-400 rounded-full mix-blend-screen filter blur-xl opacity-40 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-400 rounded-full mix-blend-screen filter blur-xl opacity-40 animate-blob animation-delay-4000"></div>
        </div>

        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center px-6 overflow-hidden">
          <div className="w-full max-w-7xl mx-auto relative z-10">
            {/* Floating particles effect */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-20 left-10 w-2 h-2 bg-blue-400 rounded-full animate-float"></div>
              <div className="absolute top-40 right-20 w-1 h-1 bg-purple-400 rounded-full animate-float-delayed"></div>
              <div className="absolute bottom-32 left-1/4 w-3 h-3 bg-cyan-400 rounded-full animate-float"></div>
              <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-pink-400 rounded-full animate-float-delayed"></div>
            </div>
            
            {/* Target audience badge */}
            <div className="text-center mb-8 animate-fade-in">
              <span className="inline-block bg-white/20 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-full text-sm font-medium shadow-lg">
                ✨ For Developers & AI Teams
              </span>
            </div>
            
            {/* Main headline with gradient text */}
            <h1 className="text-5xl md:text-7xl font-bold text-center mb-16 animate-slide-up">
              <span className="text-white drop-shadow-2xl">
                Open Source MCP
              </span>
              <span className="block bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent mt-4 drop-shadow-lg">
                Server Orchestration
              </span>
            </h1>
            
            <p className="text-xl text-white/90 text-center mb-12 max-w-4xl mx-auto leading-relaxed animate-slide-up animation-delay-300 drop-shadow-lg">
              Industry-first <span className="text-cyan-300 font-semibold">unified MCP platform</span> with enterprise-grade team collaboration. 
              Deploy anywhere, orchestrate everywhere. 
              <span className="text-purple-300 font-semibold">Zero vendor lock-in</span>, complete infrastructure control.
            </p>

            {/* Quick Install Section */}
            <div className="max-w-6xl mx-auto mb-16 text-center animate-slide-up animation-delay-600">
              <h2 className="text-3xl md:text-4xl font-bold mb-8 text-white drop-shadow-lg">
                Get Started in <span className="text-green-300">30 Seconds</span>, Connect Your First MCP Server in <span className="text-cyan-300">5 Minutes</span>
              </h2>
              
              {/* Installation Options with Glass Effect */}
              <div className="grid md:grid-cols-2 gap-8 mb-12">
                {/* Quick Start Option */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                  <div className="relative bg-black/70 backdrop-blur-xl border border-white/30 p-8 rounded-2xl text-left hover:border-white/40 transition-all duration-300 shadow-2xl">
                    <div className="text-cyan-300 font-semibold mb-4 flex items-center text-lg">
                      <span className="mr-3 text-2xl">🚀</span>
                      Quick Start (Recommended)
                    </div>
                    <div className="font-mono text-sm space-y-2 bg-black/50 p-4 rounded-lg border border-white/20">
                      <div className="text-gray-300"># Clone and start everything</div>
                      <div className="text-green-300 hover:text-green-200 transition-colors">git clone https://github.com/hihenen/mcp-orch.git</div>
                      <div className="text-blue-300 hover:text-blue-200 transition-colors">cd mcp-orch</div>
                      <div className="text-yellow-300 hover:text-yellow-200 transition-colors">./scripts/quickstart.sh</div>
                    </div>
                    <div className="mt-4 space-y-1 text-sm text-white/90">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-300 rounded-full mr-3"></div>
                        All services ready instantly
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-cyan-300 rounded-full mr-3"></div>
                        Web UI at http://localhost:3000
                      </div>
                    </div>
                  </div>
                </div>

                {/* Component-Based Option */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                  <div className="relative bg-black/70 backdrop-blur-xl border border-white/30 p-8 rounded-2xl text-left hover:border-white/40 transition-all duration-300 shadow-2xl">
                    <div className="text-purple-300 font-semibold mb-4 flex items-center text-lg">
                      <span className="mr-3 text-2xl">🔧</span>
                      Component-Based (Advanced)
                    </div>
                    <div className="font-mono text-sm space-y-2 bg-black/50 p-4 rounded-lg border border-white/20">
                      <div className="text-gray-300"># Individual component control</div>
                      <div className="text-green-300 hover:text-green-200 transition-colors">./scripts/database.sh</div>
                      <div className="text-blue-300 hover:text-blue-200 transition-colors">./scripts/backend.sh</div>
                      <div className="text-yellow-300 hover:text-yellow-200 transition-colors">./scripts/frontend.sh</div>
                      <div className="text-cyan-300 hover:text-cyan-200 transition-colors">./scripts/status.sh</div>
                    </div>
                    <div className="mt-4 space-y-1 text-sm text-white/90">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-purple-300 rounded-full mr-3"></div>
                        Granular service control
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-pink-300 rounded-full mr-3"></div>
                        Mix Docker & native execution
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Buttons with Glass Effect */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-slide-up animation-delay-900">
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
                  <Button asChild className="relative bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-2xl border-0">
                    <Link href="/auth/signin">
                      <LogIn className="w-5 h-5 mr-3" />
                      Start Your AI Orchestra
                    </Link>
                  </Button>
                </div>
                
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-500/30 to-white/30 rounded-xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
                  <Button asChild className="relative bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border border-white/20 hover:border-white/30 px-8 py-4 text-lg font-semibold rounded-xl">
                    <Link href="https://github.com/hihenen/mcp-orch" target="_blank">
                      <Star className="w-5 h-5 mr-3" />
                      View on GitHub
                    </Link>
                  </Button>
                </div>
              </div>
              
              {/* Trust indicators with modern design */}
              <div className="mt-8 text-center animate-fade-in animation-delay-1200">
                <div className="inline-flex items-center space-x-8 px-8 py-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/30">
                  <div className="flex items-center space-x-2 text-green-300">
                    <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">No registration required</span>
                  </div>
                  <div className="w-px h-4 bg-white/30"></div>
                  <div className="flex items-center space-x-2 text-cyan-300">
                    <div className="w-2 h-2 bg-cyan-300 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">100% Open source</span>
                  </div>
                  <div className="w-px h-4 bg-white/30"></div>
                  <div className="flex items-center space-x-2 text-purple-300">
                    <div className="w-2 h-2 bg-purple-300 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Self-hosted</span>
                  </div>
                </div>
                
                <div className="mt-6 grid grid-cols-3 gap-6 max-w-md mx-auto">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-300">1.2k</div>
                    <div className="text-xs text-white/70">⭐ Stars</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-300">89</div>
                    <div className="text-xs text-white/70">🍴 Forks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-300">Active</div>
                    <div className="text-xs text-white/70">📈 Development</div>
                  </div>
                </div>
                
                <p className="mt-6 text-white/90">
                  <span className="font-semibold text-white">Compatible with:</span> Claude Code, Cursor, Cline, MCP Inspector
                </p>
              </div>
            </div>

            {/* Problem visualization with modern design */}
            <div className="max-w-7xl mx-auto mb-20 animate-slide-up animation-delay-1500">
              <h3 className="text-3xl font-bold text-center mb-12 text-white">
                The <span className="text-red-400">Developer Pain</span> We're Solving
              </h3>
              <div className="grid md:grid-cols-3 gap-8">
                {/* Problem 1: Scattered Servers */}
                <div className="group text-center">
                  <div className="mb-6 relative">
                    <div className="w-40 h-40 mx-auto bg-gradient-to-br from-red-500/20 to-red-600/20 backdrop-blur-sm border border-red-500/30 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-all duration-300">
                      <div className="space-y-3">
                        <div className="flex space-x-2 justify-center">
                          <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                          <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse animation-delay-500"></div>
                          <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse animation-delay-1000"></div>
                        </div>
                        <div className="w-8 h-1 bg-red-400 mx-auto rounded-full opacity-50"></div>
                        <div className="text-xs text-red-300 font-mono font-bold">SCATTERED</div>
                      </div>
                    </div>
                    <span className="absolute -top-3 -right-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs px-3 py-1 rounded-full shadow-lg">
                      😵 Pain Point
                    </span>
                  </div>
                  <h3 className="font-bold mb-3 text-xl text-white">Scattered Chaos</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    MCP servers scattered across projects, repos, and developer machines. 
                    <span className="text-red-400 font-semibold">No centralized control.</span>
                  </p>
                </div>

                {/* Problem 2: No Team Sync */}
                <div className="group text-center">
                  <div className="mb-6 relative">
                    <div className="w-40 h-40 mx-auto bg-gradient-to-br from-orange-500/20 to-orange-600/20 backdrop-blur-sm border border-orange-500/30 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-all duration-300">
                      <div className="space-y-3">
                        <Users className="w-10 h-10 text-orange-400 mx-auto" />
                        <div className="w-8 h-1 bg-orange-400 mx-auto relative rounded-full">
                          <X className="w-6 h-6 text-red-500 absolute -top-2 left-1/2 transform -translate-x-1/2 animate-pulse" />
                        </div>
                        <div className="text-xs text-orange-300 font-mono font-bold">ISOLATED</div>
                      </div>
                    </div>
                    <span className="absolute -top-3 -right-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs px-3 py-1 rounded-full shadow-lg">
                      🔥 Pain Point
                    </span>
                  </div>
                  <h3 className="font-bold mb-3 text-xl text-white">Team Isolation</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    No sharing, no collaboration, no visibility. 
                    <span className="text-orange-400 font-semibold">Everyone works in silos.</span>
                  </p>
                </div>

                {/* Problem 3: Manual Setup */}
                <div className="group text-center">
                  <div className="mb-6 relative">
                    <div className="w-40 h-40 mx-auto bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 backdrop-blur-sm border border-yellow-500/30 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-all duration-300">
                      <div className="space-y-3">
                        <Settings className="w-10 h-10 text-yellow-400 mx-auto animate-spin" />
                        <div className="flex space-x-1 justify-center">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce animation-delay-300"></div>
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce animation-delay-600"></div>
                        </div>
                        <div className="text-xs text-yellow-300 font-mono font-bold">REPETITIVE</div>
                      </div>
                    </div>
                    <span className="absolute -top-3 -right-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white text-xs px-3 py-1 rounded-full shadow-lg">
                      ⚡ Pain Point
                    </span>
                  </div>
                  <h3 className="font-bold mb-3 text-xl text-white">Configuration Hell</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Copy-paste configs for every project. 
                    <span className="text-yellow-400 font-semibold">Hours wasted on setup.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Enhanced code example showing the problem */}
            <div className="max-w-5xl mx-auto mb-20 animate-slide-up animation-delay-1800">
              <div className="text-center mb-8">
                <p className="text-gray-300 mb-4 text-xl">Sound painfully familiar?</p>
                <div className="inline-flex items-center px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-full text-red-300 text-sm">
                  <span className="w-2 h-2 bg-red-400 rounded-full mr-2 animate-pulse"></span>
                  The same config, copy-pasted everywhere
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                  <div className="relative bg-black/60 backdrop-blur-sm border border-red-500/30 p-6 rounded-2xl text-sm font-mono">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-red-300 text-xs">📁 Project A - cline_mcp_settings.json</div>
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                    </div>
                    <pre className="text-gray-300">{`{
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
                </div>
                
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                  <div className="relative bg-black/60 backdrop-blur-sm border border-orange-500/30 p-6 rounded-2xl text-sm font-mono">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-orange-300 text-xs">📁 Project B - cline_mcp_settings.json</div>
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                    </div>
                    <pre className="text-gray-300">{`{
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
    `}<span className="text-red-400">{`// Where's slack? Copy-paste again?`}</span>{`
  }
}`}</pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced scroll indicator */}
            <div className="text-center animate-fade-in animation-delay-2100">
              <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-sm border border-green-500/30 rounded-full mb-6">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse"></span>
                <p className="text-green-300 font-semibold text-lg">There's a better way</p>
              </div>
              <ChevronDown className="w-8 h-8 mx-auto text-gray-400 animate-bounce" />
            </div>
          </div>
        </section>

        {/* Features Highlight Section */}
        <section className="py-32 bg-gradient-to-br from-white via-blue-50 to-purple-50 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0">
            <div className="absolute top-20 left-10 w-32 h-32 bg-blue-200/30 rounded-full blur-2xl"></div>
            <div className="absolute bottom-20 right-10 w-40 h-40 bg-purple-200/30 rounded-full blur-2xl"></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-20">
              <div className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-sm font-semibold mb-4 tracking-wide uppercase">
                Why Choose MCP Orchestrator
              </div>
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                Built for <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Modern AI Teams</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                Industry-first unified platform that transforms how development teams manage MCP infrastructure. 
                From startup to enterprise scale.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <div className="relative bg-white/70 backdrop-blur-sm border border-white/50 p-10 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 group-hover:scale-105">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform duration-300">
                    <span className="text-3xl">🚀</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-gray-900">Lightning-Fast Deployment</h3>
                  <p className="text-gray-600 leading-relaxed mb-6">
                    From zero to full MCP infrastructure in <span className="font-semibold text-blue-600">30 seconds</span>. 
                    Docker, UV, or native deployment. No complex configuration nightmares.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-500">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                      One-command setup
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                      Auto-configured services
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                      Production-ready defaults
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Feature 2 */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <div className="relative bg-white/70 backdrop-blur-sm border border-white/50 p-10 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 group-hover:scale-105">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform duration-300">
                    <span className="text-3xl">🔗</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-gray-900">Universal AI Compatibility</h3>
                  <p className="text-gray-600 leading-relaxed mb-6">
                    Works with <span className="font-semibold text-purple-600">every MCP tool</span> out of the box. 
                    Claude Code, Cursor, Cline, VS Code extensions – seamless integration.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-500">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                      Standard MCP protocol
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                      Auto-generated configs
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                      Zero client changes needed
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Feature 3 */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <div className="relative bg-white/70 backdrop-blur-sm border border-white/50 p-10 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 group-hover:scale-105">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform duration-300">
                    <span className="text-3xl">👥</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-gray-900">Enterprise Team Collaboration</h3>
                  <p className="text-gray-600 leading-relaxed mb-6">
                    Real-time team sync, role-based permissions, activity tracking. 
                    <span className="font-semibold text-green-600">Scale from 1 to 1000+ developers</span>.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-500">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                      Live activity monitoring
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                      Granular access control
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                      Shared configurations
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* System Requirements */}
            <div className="mt-16 bg-white p-8 rounded-lg shadow-sm max-w-2xl mx-auto">
              <h3 className="text-xl font-bold mb-4 text-center">System Requirements</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Minimum Setup</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Python 3.8+ or Docker</li>
                    <li>• PostgreSQL (included in Docker)</li>
                    <li>• 2GB RAM minimum</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Recommended</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 4GB+ RAM for teams</li>
                    <li>• SSD storage</li>
                    <li>• Linux/macOS/Windows</li>
                  </ul>
                </div>
              </div>
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

        {/* MCP Unified Management Section */}
        <section className="py-24 border-t px-6 bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="w-full max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
                Industry First: MCP Command Center
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                From MCP Chaos to Enterprise Orchestra
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Stop managing dozens of individual MCP servers. Start conducting your AI infrastructure like a symphony.
              </p>
            </div>

            {/* Before/After Comparison */}
            <div className="max-w-6xl mx-auto mb-16">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Before - Chaos */}
                <div className="relative">
                  <div className="absolute -top-4 left-4 bg-red-500 text-white px-3 py-1 rounded text-sm font-medium">
                    The Old Way: MCP Chaos
                  </div>
                  <div className="border-2 border-red-200 rounded-lg p-6 bg-red-50">
                    <div className="space-y-4">
                      <div className="text-red-800 font-semibold mb-4">Your Current Reality:</div>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-3">
                          <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="font-medium">GitHub MCP Server</div>
                            <div className="text-gray-600 font-mono text-xs">localhost:8001/github/sse</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="font-medium">Slack MCP Server</div>
                            <div className="text-gray-600 font-mono text-xs">localhost:8002/slack/sse</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="font-medium">Notion MCP Server</div>
                            <div className="text-gray-600 font-mono text-xs">localhost:8003/notion/sse</div>
                          </div>
                        </div>
                        <div className="border-t pt-3 mt-4 text-red-700">
                          <div className="font-medium">IT Security asks:</div>
                          <div className="italic">"How many AI tools are we really using?"</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* After - Orchestra */}
                <div className="relative">
                  <div className="absolute -top-4 left-4 bg-green-500 text-white px-3 py-1 rounded text-sm font-medium">
                    MCP Orchestrator: Command Center
                  </div>
                  <div className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
                    <div className="space-y-4">
                      <div className="text-green-800 font-semibold mb-4">Your New Reality:</div>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                          <div>
                            <div className="font-medium">Unified Endpoint</div>
                            <div className="text-gray-600 font-mono text-xs">localhost:8000/projects/abc/unified/sse</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                          <div>
                            <div className="font-medium">Namespace Magic</div>
                            <div className="text-gray-600 text-xs">github.search(), slack.send(), notion.create()</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                          <div>
                            <div className="font-medium">Zero Config Scaling</div>
                            <div className="text-gray-600 text-xs">Add unlimited servers, zero client updates</div>
                          </div>
                        </div>
                        <div className="border-t pt-3 mt-4 text-green-700">
                          <div className="font-medium">IT Security gets:</div>
                          <div className="italic">"100% visibility, centralized control"</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Flexible Management Options */}
            <div className="max-w-4xl mx-auto mb-16">
              <h3 className="text-2xl font-bold text-center mb-8">Choose Your Management Style</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 font-bold">1</span>
                    </div>
                    <h4 className="font-semibold">Individual Server Control</h4>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">
                    Perfect for getting started or when you need granular control over specific servers.
                  </p>
                  <div className="bg-gray-50 p-3 rounded font-mono text-xs">
                    /servers/github/sse<br/>
                    /servers/slack/sse
                  </div>
                </div>
                <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 font-bold">∞</span>
                    </div>
                    <h4 className="font-semibold">Unified Orchestra Mode</h4>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">
                    Scale to enterprise with one endpoint for unlimited servers and centralized governance.
                  </p>
                  <div className="bg-gray-50 p-3 rounded font-mono text-xs">
                    /unified/sse<br/>
                    <span className="text-gray-500">// All servers, one endpoint</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ROI Calculator */}
            <div className="max-w-4xl mx-auto bg-white rounded-lg border border-gray-200 p-8">
              <h3 className="text-xl font-bold mb-6 text-center">The ROI of MCP Centralization</h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold text-red-600 mb-4">Without MCP-Orch:</h4>
                  <div className="space-y-2 text-sm">
                    <div>• 50 developers × 3 servers × 30min setup</div>
                    <div>• = 75 hours/month configuration overhead</div>
                    <div>• Shadow IT proliferation</div>
                    <div>• Manual compliance reporting</div>
                    <div className="font-bold text-red-600 pt-2">Cost: $18,000+ annually</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-green-600 mb-4">With MCP-Orch:</h4>
                  <div className="space-y-2 text-sm">
                    <div>• One-time setup, infinite scale</div>
                    <div>• 100% infrastructure visibility</div>
                    <div>• Automated compliance & governance</div>
                    <div>• Zero shadow IT risk</div>
                    <div className="font-bold text-green-600 pt-2">Savings: 90% reduction</div>
                  </div>
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
                    <pre>{`# Quick start with all services
$ git clone https://github.com/hihenen/mcp-orch.git
$ cd mcp-orch
$ ./scripts/quickstart.sh

✓ Database ready (PostgreSQL)
✓ Backend running (Python native)
✓ Frontend deployed (Docker)
✓ Web UI → http://localhost:3000

# Or individual component control
$ ./scripts/database.sh    # PostgreSQL only
$ ./scripts/backend.sh     # Python backend
$ ./scripts/frontend.sh    # Docker frontend
$ ./scripts/status.sh      # Check all services`}</pre>
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
                  Quick Start (All-in-One)
                </h3>
                <pre className="text-green-400 text-sm font-mono">
{`git clone https://github.com/your-org/mcp-orch
cd mcp-orch
./scripts/quickstart.sh

# All services ready instantly
# Web UI: http://localhost:3000
# Optimal for rapid development`}
                </pre>
              </div>
              <div className="bg-gray-900 text-left p-6 rounded-lg">
                <h3 className="text-white font-semibold mb-4 flex items-center">
                  <span className="text-2xl mr-3">🔧</span>
                  Component Control
                </h3>
                <pre className="text-green-400 text-sm font-mono">
{`# Individual service management
./scripts/database.sh     # PostgreSQL
./scripts/backend.sh      # Python backend
./scripts/frontend.sh     # Docker frontend
./scripts/status.sh       # Check all

# Mix Docker & native execution
# Perfect for advanced development`}
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
    const projectName = projects.find(p => p.id === projectId)?.name || '프로젝트';
    const confirmed = await showDeleteConfirm(projectName, '프로젝트');
    if (confirmed) {
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
