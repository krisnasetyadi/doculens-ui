"use client";

import { useState } from "react";
import { ChatInterface } from "@/components/chat-interface";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { PdfViewerDialog } from "@/components/pdf-viewer-dialog";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [apiUrl, setApiUrl] = useState(process.env.NEXT_PUBLIC_API_URL || "");

  // PDF Preview state
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState("");

  const handlePreviewPdf = (collectionId: string, fileName: string) => {
    const url = `${apiUrl}/api/v1/files/${collectionId}/${encodeURIComponent(
      fileName
    )}`;
    setPdfPreviewUrl(url);
    setPdfPreviewTitle(fileName.replace(/\.pdf$/i, ""));
    setPdfPreviewOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        apiUrl={apiUrl}
        onApiUrlChange={setApiUrl}
        onPreviewPdf={handlePreviewPdf}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-4 px-4 h-14">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">🔍</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  DocuLens
                </h1>
                <p className="text-xs text-muted-foreground">
                  AI-powered Document Q&A
                </p>
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

      {/* PDF Preview Dialog */}
      <PdfViewerDialog
        open={pdfPreviewOpen}
        onOpenChange={setPdfPreviewOpen}
        pdfUrl={pdfPreviewUrl}
        fileName={pdfPreviewTitle}
      />
    </div>
  );
}
