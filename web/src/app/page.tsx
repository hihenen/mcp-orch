import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Server, Wrench, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            MCP Orch
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Orchestrate Multiple MCP Servers with Ease
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <Server className="w-10 h-10 mb-2 text-blue-600" />
              <CardTitle>Proxy Mode</CardTitle>
              <CardDescription>
                Integrate multiple MCP servers into a single endpoint
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Connect and manage all your MCP servers through one unified interface.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="w-10 h-10 mb-2 text-purple-600" />
              <CardTitle>Batch Mode</CardTitle>
              <CardDescription>
                Automatically parallelize tasks with LLM
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Let AI analyze and optimize your workflows for maximum efficiency.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Wrench className="w-10 h-10 mb-2 text-green-600" />
              <CardTitle>Easy Integration</CardTitle>
              <CardDescription>
                Works with Cursor, Cline, and more
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Compatible with your favorite development tools out of the box.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Link href="/dashboard">
            <Button size="lg" className="mr-4">
              Go to Dashboard
            </Button>
          </Link>
          <Link href="/en">
            <Button size="lg" variant="outline" className="mr-2">
              English
            </Button>
          </Link>
          <Link href="/ko">
            <Button size="lg" variant="outline">
              한국어
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
