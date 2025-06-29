import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MCP Orch - Open Source MCP Server Orchestration",
  description: "Self-hosted MCP server management platform with project-based team collaboration. Deploy anywhere, manage everywhere. No vendor lock-in, full control over your AI infrastructure.",
  keywords: "MCP, Model Context Protocol, AI, Server Management, Open Source, Self-hosted, Team Collaboration",
  authors: [{ name: "MCP Orch Team" }],
  creator: "MCP Orch",
  publisher: "MCP Orch",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://mcp-orch.com",
    title: "MCP Orch - Open Source MCP Server Orchestration",
    description: "Self-hosted MCP server management platform with project-based team collaboration.",
    siteName: "MCP Orch",
  },
  twitter: {
    card: "summary_large_image",
    title: "MCP Orch - Open Source MCP Server Orchestration",
    description: "Self-hosted MCP server management platform with project-based team collaboration.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppLayout>{children}</AppLayout>
        <Toaster />
      </body>
    </html>
  );
}
