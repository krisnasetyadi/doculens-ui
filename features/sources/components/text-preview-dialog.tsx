"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Panel } from "@/components/panel";
import { TruncatedTooltip } from "@/components/truncated-tooltip";
import { pdfCollectionsQueries } from "@/services/pdf-collections/handler/pdf-collections.queries";
import type { TextContentAnchor } from "@/services/pdf-collections/type/pdf-collection.type";
import { downloadAuthenticatedFile } from "@/features/sources/lib/source-file";
import { PlainTextViewerSkeleton, PlainTextViewerTable } from "./plain-text-viewer-table";

export interface TextPreviewSource extends TextContentAnchor {
  collectionId: string;
  fileName: string;
  fileUrl?: string;
  /** Where the preview opens, as a person reads it ("Section 4. Restore, paragraph 2"). */
  placeLabel?: string;
}

/** A document's text, line by line, opened at a place: a .pptx cited in a chat answer at its slide
 * (MS-910), or a .docx paragraph / .xlsx row a gap analysis finding points at (MS-1112). That line
 * is highlighted. */
export function TextPreviewDialog({ source, onClose }: { source: TextPreviewSource | null; onClose: () => void }) {
  return (
    <Dialog open={!!source} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[95vw] max-w-[95vw] grid-cols-1 overflow-y-auto sm:max-w-3xl">
        {source && <TextPreview source={source} />}
      </DialogContent>
    </Dialog>
  );
}

function TextPreview({ source }: { source: TextPreviewSource }) {
  const { collectionId, fileName, fileUrl, placeLabel, ...anchor } = source;
  const { data, error, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteQuery(
    pdfCollectionsQueries.textContent(collectionId, fileName, anchor),
  );
  const lines = data?.pages.flatMap((page) => page.lines) ?? [];
  const total = data?.pages[0]?.total_lines ?? 0;
  const targetLine = data?.pages[0]?.target_line ?? null;
  const ext = fileName.split(".").pop()?.toUpperCase() ?? "";
  const place = placeLabel ?? (anchor.slide ? `Slide ${anchor.slide}` : null);

  return (
    <>
      <DialogHeader className="min-w-0 pr-8 text-left">
        <TruncatedTooltip label={`Text preview: ${fileName}`}>
          <DialogTitle className="truncate font-manrope text-[15px] font-bold leading-tight text-foreground">Text preview: {fileName}</DialogTitle>
        </TruncatedTooltip>
      </DialogHeader>
      {!isPending && !error && (
        <div className="flex items-center gap-2 flex-wrap -mt-2">
          {ext && <Badge variant="info">{ext}</Badge>}
          {place && <Badge variant="info">{place}</Badge>}
          {(anchor.paragraph || anchor.row) && targetLine === null && (
            <span className="text-[11px] text-muted-foreground">This place was not found in the current version of the file.</span>
          )}
          <span className="text-[11px] text-muted-foreground">
            {total.toLocaleString("en-US")} {total === 1 ? "line" : "lines"}
          </span>
          {fileUrl && (
            <Button
              variant="outline"
              size="xs"
              className="ml-auto"
              icon={<Download className="size-3.5" />}
              onClick={() => downloadAuthenticatedFile(fileUrl, fileName)}
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
          highlightLine={targetLine}
        />
      )}
    </>
  );
}
