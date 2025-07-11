'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AddServerDialog } from '@/components/servers/AddServerDialog';
import { useRouter, useParams } from 'next/navigation';
import { 
  Search, 
  Plus, 
  Github, 
  ExternalLink, 
  Briefcase, 
  Code, 
  Bot, 
  Database,
  Star,
  Download,
  CheckCircle
} from 'lucide-react';

interface MarketplaceServer {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tags: string[];
  verified: boolean;
  repository?: string;
  config: {
    command: string;
    args: string[];
    env_template: Record<string, string>;
    timeout: number;
    transport: string;
  };
  setup: {
    required_env: string[];
    setup_guide: string;
  };
}

interface Category {
  name: string;
  icon: string;
  description: string;
}

interface MarketplaceData {
  servers: Record<string, MarketplaceServer>;
  categories: Record<string, Category>;
  featured_servers: string[];
}

const categoryIcons = {
  briefcase: Briefcase,
  code: Code,
  bot: Bot,
  database: Database,
};

export default function MarketplacePage() {
  const [marketplaceData, setMarketplaceData] = useState<MarketplaceData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedMarketplaceServer, setSelectedMarketplaceServer] = useState<MarketplaceServer | null>(null);
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  useEffect(() => {
    loadMarketplaceData();
  }, []);


  const loadMarketplaceData = async () => {
    try {
      setIsLoading(true);
      
      // Load categories and servers from configs
      const [categoriesRes, serversRes] = await Promise.all([
        fetch('/api/marketplace/categories'),
        fetch('/api/marketplace/servers')
      ]);

      const categories = await categoriesRes.json();
      const servers = await serversRes.json();

      setMarketplaceData({
        servers: servers.servers || {},
        categories: categories.categories || {},
        featured_servers: ['github', 'browsermcp', 'filesystem', 'brave-search']
      });
    } catch (error) {
      console.error('Failed to load marketplace data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddServer = (serverId: string, server: MarketplaceServer) => {
    // 마켓플레이스 서버 설정으로 AddServerDialog 열기
    setSelectedMarketplaceServer({ ...server, id: serverId });
    setShowAddDialog(true);
  };

  const handleServerAdded = (server: any) => {
    setShowAddDialog(false);
    setSelectedMarketplaceServer(null);
    // 서버가 성공적으로 추가되었음을 알리는 로직
    // 선택적으로 서버 페이지로 이동
    router.push(`/projects/${projectId}/servers`);
  };

  const filteredServers = marketplaceData ? Object.entries(marketplaceData.servers).filter(([id, server]) => {
    const matchesSearch = server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         server.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         server.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || server.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  }) : [];

  const featuredServers = marketplaceData ? 
    marketplaceData.featured_servers
      .map(id => [id, marketplaceData.servers[id]] as [string, MarketplaceServer])
      .filter(([_, server]) => server) : [];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MCP 마켓플레이스</h1>
          <p className="text-muted-foreground mt-2">검증된 MCP 서버를 찾아 바로 설치하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            검증된 서버 {marketplaceData ? Object.keys(marketplaceData.servers).length : 0}개
          </Badge>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="서버 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('all')}
            size="sm"
          >
            전체
          </Button>
          {marketplaceData && Object.entries(marketplaceData.categories).map(([id, category]) => {
            const IconComponent = categoryIcons[category.icon as keyof typeof categoryIcons];
            return (
              <Button
                key={id}
                variant={selectedCategory === id ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(id)}
                size="sm"
                className="flex items-center gap-2"
              >
                {IconComponent && <IconComponent className="h-4 w-4" />}
                {category.name}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">전체 서버</TabsTrigger>
          <TabsTrigger value="featured">추천 서버</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {/* Server Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServers.map(([id, server]) => (
              <ServerCard
                key={id}
                id={id}
                server={server}
                onAdd={handleAddServer}
              />
            ))}
          </div>

          {filteredServers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">검색 결과가 없습니다.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="featured" className="space-y-6">
          {/* Featured Servers */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredServers.map(([id, server]) => (
              <ServerCard
                key={id}
                id={id}
                server={server}
                onAdd={handleAddServer}
                featured={true}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Server Dialog */}
      {selectedMarketplaceServer && (
        <AddServerDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onServerAdded={handleServerAdded}
          projectId={projectId}
          marketplaceConfig={selectedMarketplaceServer}
        />
      )}
    </div>
  );
}

interface ServerCardProps {
  id: string;
  server: MarketplaceServer;
  onAdd: (id: string, server: MarketplaceServer) => void;
  featured?: boolean;
}

function ServerCard({ id, server, onAdd, featured = false }: ServerCardProps) {
  const categoryIcons = {
    briefcase: Briefcase,
    code: Code,
    bot: Bot,
    database: Database,
  };

  const getCategoryIcon = (category: string) => {
    const iconMap = {
      'productivity': Briefcase,
      'development': Code,
      'automation': Bot,
      'data': Database,
    };
    return iconMap[category as keyof typeof iconMap] || Code;
  };

  const CategoryIcon = getCategoryIcon(server.category);

  return (
    <Card className="group hover:shadow-lg transition-shadow relative">
      {featured && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge variant="default" className="bg-yellow-500 text-white">
            <Star className="h-3 w-3 mr-1" />
            추천
          </Badge>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <CategoryIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">{server.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {server.verified && (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    검증됨
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {server.category === 'productivity' && '생산성'}
                  {server.category === 'development' && '개발'}
                  {server.category === 'automation' && '자동화'}
                  {server.category === 'data' && '데이터'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <CardDescription className="text-sm leading-relaxed">
          {server.description}
        </CardDescription>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {server.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {server.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{server.tags.length - 3}
            </Badge>
          )}
        </div>

        {/* Environment Variables Info */}
        <div className="text-xs text-muted-foreground">
          필수 환경변수: {server.setup.required_env.length > 0 ? server.setup.required_env.join(', ') : '없음'}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => onAdd(id, server)}
            className="flex-1 flex items-center gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            추가하기
          </Button>
          
          <div className="flex gap-1">
            {server.repository && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(server.repository, '_blank')}
                className="p-2"
              >
                <Github className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(server.setup.setup_guide, '_blank')}
              className="p-2"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}