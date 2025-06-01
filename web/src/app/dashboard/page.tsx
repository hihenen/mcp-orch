"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Server, Zap, Activity, Settings } from "lucide-react";

export default function DashboardPage() {
  const [mode, setMode] = useState<"proxy" | "batch">("proxy");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">MCP Orch Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and monitor your MCP servers
          </p>
        </div>

        {/* Mode Selector */}
        <div className="mb-8">
          <div className="flex gap-4">
            <Button
              variant={mode === "proxy" ? "default" : "outline"}
              onClick={() => setMode("proxy")}
            >
              <Server className="w-4 h-4 mr-2" />
              Proxy Mode
            </Button>
            <Button
              variant={mode === "batch" ? "default" : "outline"}
              onClick={() => setMode("batch")}
            >
              <Zap className="w-4 h-4 mr-2" />
              Batch Mode
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Servers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">2</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Executions Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
            </CardContent>
          </Card>
        </div>

        {/* Server Status */}
        <Card>
          <CardHeader>
            <CardTitle>Server Status</CardTitle>
            <CardDescription>
              Connected MCP servers and their current status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Server className="w-8 h-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold">GitHub Server</h3>
                    <p className="text-sm text-gray-600">12 tools available</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">Online</Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Server className="w-8 h-8 text-purple-600" />
                  <div>
                    <h3 className="font-semibold">Notion Server</h3>
                    <p className="text-sm text-gray-600">8 tools available</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">Online</Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Server className="w-8 h-8 text-gray-400" />
                  <div>
                    <h3 className="font-semibold">Slack Server</h3>
                    <p className="text-sm text-gray-600">4 tools available</p>
                  </div>
                </div>
                <Badge className="bg-gray-100 text-gray-800">Offline</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
