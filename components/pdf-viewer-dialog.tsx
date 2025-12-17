"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  Loader2,
  FileText,
  Copy,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";

interface PdfViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string;
  fileName: string;
  initialPage?: number;
  searchText?: string;
  contentPreview?: string;
}

export function PdfViewerDialog({
  open,
  onOpenChange,
  pdfUrl,
  fileName,
  initialPage = 1,
  searchText,
  contentPreview,
}: PdfViewerDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [zoom, setZoom] = useState(100);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  // Build PDF URL with page parameter
  // Browser PDF viewers support: #page=X for navigation
  const buildPdfUrl = () => {
    let url = pdfUrl;

    // Add page parameter for direct navigation
    if (currentPage && currentPage > 0) {
      url += `#page=${currentPage}`;

      // Some browsers also support zoom
      if (zoom !== 100) {
        url += `&zoom=${zoom}`;
      }
    }

    return url;
  };

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);
      setCurrentPage(initialPage);
    }
  }, [open, initialPage]);

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setLoading(true);
      setCurrentPage((prev) => prev - 1);
    }
  };

  const goToNextPage = () => {
    setLoading(true);
    setCurrentPage((prev) => prev + 1);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const openInNewTab = () => {
    window.open(buildPdfUrl(), "_blank");
  };

  const copySearchText = () => {
    const textToCopy = searchText || contentPreview;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Function to trigger Ctrl+F in iframe (hint for user)
  const triggerSearch = () => {
    if (iframeRef.current) {
      try {
        // Try to focus iframe first
        iframeRef.current.focus();
        // Alert user to use Ctrl+F manually
        alert(
          `Tekan Ctrl+F dan cari: "${
            searchText?.substring(0, 50) || contentPreview?.substring(0, 50)
          }..."`
        );
      } catch {
        // Fallback: just alert
        alert(`Gunakan Ctrl+F untuk mencari teks di PDF`);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex flex-col p-0 !max-w-[98vw] !w-[98vw] !max-h-[98vh] !h-[98vh]"
        style={{
          maxWidth: "98vw",
          width: "98vw",
          maxHeight: "98vh",
          height: "98vh",
        }}
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <FileText className="h-5 w-5 text-teal-500 shrink-0" />
              <DialogTitle className="text-base truncate">
                {fileName}
              </DialogTitle>
              <Badge variant="outline" className="shrink-0">
                Halaman {currentPage}
              </Badge>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Page navigation */}
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevPage}
                disabled={currentPage <= 1}
                title="Halaman sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                title="Halaman selanjutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1" />

              {/* Zoom controls */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground w-12 text-center">
                {zoom}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1" />

              <Button
                variant="outline"
                size="sm"
                onClick={openInNewTab}
                title="Buka di tab baru"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1" />

              {/* Close Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                title="Tutup"
                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Search Text Info Box - Shows the text to look for */}
        {(searchText || contentPreview) && (
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <Search className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="text-sm min-w-0 flex-1">
                  <p className="font-medium text-amber-800 dark:text-amber-300 mb-0.5">
                    🎯 Teks sumber jawaban (Halaman {initialPage}):
                  </p>
                  <p className="text-amber-700 dark:text-amber-400 text-xs line-clamp-3 bg-amber-100 dark:bg-amber-900/50 p-2 rounded border border-amber-200 dark:border-amber-800">
                    "{searchText || contentPreview}"
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copySearchText}
                  className="h-7 px-2"
                  title="Salin teks"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={triggerSearch}
                  className="h-7 px-2 text-xs"
                >
                  <Search className="h-3 w-3 mr-1" />
                  Cari (Ctrl+F)
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* PDF Viewer - Using native browser PDF viewer */}
        <div className="flex-1 relative min-h-0 bg-gray-100 dark:bg-gray-900">
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
                <p className="text-sm text-muted-foreground">
                  Memuat PDF halaman {currentPage}...
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-4 text-center max-w-md mx-auto p-6">
                <AlertTriangle className="h-12 w-12 text-destructive" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    PDF Tidak Dapat Dimuat
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">{error}</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setError(null);
                      setLoading(true);
                      // Force iframe reload
                      if (iframeRef.current) {
                        iframeRef.current.src = buildPdfUrl();
                      }
                    }}
                  >
                    Coba Lagi
                  </Button>
                </div>
              </div>
            </div>
          )}

          <iframe
            ref={iframeRef}
            key={`${pdfUrl}-${currentPage}`} // Force reload when page changes
            src={buildPdfUrl()}
            className="w-full h-full border-0"
            onLoad={() => {
              setLoading(false);
              setError(null);
            }}
            onError={() => {
              setLoading(false);
              const errorMsg = `Gagal memuat PDF ${fileName}. File mungkin tidak ditemukan atau tidak dapat diakses.`;
              setError(errorMsg);
              toast({
                title: "PDF Loading Error",
                description: errorMsg,
                variant: "destructive",
              });
            }}
            title={`PDF Viewer - ${fileName}`}
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top left",
              width: `${10000 / zoom}%`,
              height: `${10000 / zoom}%`,
            }}
          />
        </div>

        {/* Footer with instructions */}
        <div className="px-4 py-2 bg-muted/50 border-t text-xs text-muted-foreground shrink-0">
          <div className="flex items-center justify-between">
            <span>
              💡 <strong>Tip:</strong> Tekan Ctrl+F lalu paste teks di atas
              untuk langsung menuju ke sumber jawaban
            </span>
            <span>
              Halaman {currentPage} •{" "}
              {initialPage !== currentPage && `(Sumber: Hal. ${initialPage})`}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
