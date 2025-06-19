'use client';

import { Navigation } from './Navigation';
import { UserMenu } from './UserMenu';
import { SessionProvider } from 'next-auth/react';
import Link from 'next/link';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-[1600px] mx-auto px-4 flex h-16 items-center">
            <div className="mr-8">
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-xl font-bold">MCP Orch</span>
              </Link>
            </div>
            <div className="flex-1">
              <Navigation />
            </div>
            <div className="flex items-center space-x-4">
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          <div className="max-w-[1600px] mx-auto px-4 py-6">
            {children}
          </div>
        </main>
      </div>
    </SessionProvider>
  );
}
