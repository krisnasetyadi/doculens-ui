"use client"

import { useState } from "react"
import { ChatInterface } from "@/components/chat-interface"
import { Sidebar } from "@/components/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [apiUrl, setApiUrl] = useState("http://localhost:8000")

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} apiUrl={apiUrl} onApiUrlChange={setApiUrl} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-4 px-4 h-14">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">AI</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">PDF QA Assistant</h1>
                <p className="text-xs text-muted-foreground">Query your documents with AI</p>
              </div>
            </div>
            {/* Theme Toggle Button */}
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Chat Interface */}
        <ChatInterface apiUrl={apiUrl} />
      </div>
    </div>
  )
}
