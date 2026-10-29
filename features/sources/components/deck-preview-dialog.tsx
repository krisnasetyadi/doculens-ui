"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Panel } from "@/components/panel";
import { TruncatedTooltip } from "@/components/truncated-tooltip";
import { pdfCollectionsQueries } from "@/services/pdf-collections/handler/pdf-collections.queries";
import { downloadAuthenticatedFile } from "@/features/sources/lib/source-file";
import { PlainTextViewerSkeleton, PlainTextViewerTable } from "./plain-text-viewer-table";

export interface DeckPreviewSource {
  collectionId: string;
  fileName: string;
  /** The cited slide; the viewer opens on its "Slide N" line. */
  slide?: number;
  fileUrl?: string;
}

/** A .pptx source cited in a chat answer, shown slide by slide from the cited slide on (MS-910). */
export function DeckPreviewDialog({ source, onClose }: { source: DeckPreviewSource | null; onClose: () => void }) {
  return (
    <Dialog open={!!source} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[95vw] max-w-[95vw] grid-cols-1 overflow-y-auto sm:max-w-3xl">
        {source && <DeckPreview source={source} />}
      </DialogContent>
    </Dialog>
  );
}

function DeckPreview({ source }: { source: DeckPreviewSource }) {
  const { data, error, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteQuery(
    pdfCollectionsQueries.textContent(source.collectionId, source.fileName, source.slide),
  );
  const lines = data?.pages.flatMap((page) => page.lines) ?? [];
  const total = data?.pages[0]?.total_lines ?? 0;

  return (
    <>
      <DialogHeader className="min-w-0 pr-8 text-left">
        <TruncatedTooltip label={`Text preview: ${source.fileName}`}>
          <DialogTitle className="truncate font-manrope text-[15px] font-bold leading-tight text-foreground">Text preview: {source.fileName}</DialogTitle>
        </TruncatedTooltip>
      </DialogHeader>
      {!isPending && !error && (
        <div className="flex items-center gap-2 flex-wrap -mt-2">
          <Badge variant="info">PPTX</Badge>
          {source.slide && <Badge variant="info">Slide {source.slide}</Badge>}
          <span className="text-[11px] text-muted-foreground">
            {total.toLocaleString("en-US")} {total === 1 ? "line" : "lines"}
          </span>
          {source.fileUrl && (
            <Button
              variant="outline"
              size="xs"
              className="ml-auto"
              icon={<Download className="size-3.5" />}
              onClick={() => downloadAuthenticatedFile(source.fileUrl!, source.fileName)}
            >
              Download
            </Button>
          )}
        </div>
      )}
      {isPending ? (
        <PlainTextViewerSkeleton />
      ) : error ? (
        <Panel tone="muted" padding="sm">
          <p className="text-xs text-destructive">Could not load the text preview.</p>
        </Panel>
      ) : (
        <PlainTextViewerTable
          lines={lines}
          total={total}
          hasMore={hasNextPage}
          loadingMore={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
        />
      )}
    </>
  );
}
