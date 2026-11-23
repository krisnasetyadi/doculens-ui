"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PdfViewerDialog } from "@/components/pdf-viewer-dialog";
import { TextPreviewDialog } from "@/features/sources/components/text-preview-dialog";
import { useToast, errorToast } from "@/hooks/use-toast";
import { filesQueries } from "@/services/files/handler/files.queries";
import type { GapAnalysisPointer } from "@/services/gap-analysis/type/gap-analysis.type";
import { pointerOpen, pointerPlace } from "../_lib/results";

/** Opens the place a finding points at (MS-1112): a PDF in the viewer at its page; a Word paragraph,
 * spreadsheet row or slide in the text preview with that line highlighted. The page downloads the
 * formats neither viewer can show instead of opening them here (see `pointerOpen`). */
export function PointerViewer({ pointer, onClose }: { pointer: GapAnalysisPointer | null; onClose: () => void }) {
  if (!pointer?.collection_id) return null;
  const open = pointerOpen(pointer);
  if (open.mode === "pdf") {
    return <PdfPointer collectionId={pointer.collection_id} fileName={pointer.file_name} page={open.page} onClose={onClose} />;
  }
  if (open.mode === "text") {
    return (
      <TextPreviewDialog
        source={{ collectionId: pointer.collection_id, fileName: pointer.file_name, placeLabel: pointerPlace(pointer) ?? undefined, ...open.anchor }}
        onClose={onClose}
      />
    );
  }
  return null;
}

function PdfPointer({
  collectionId,
  fileName,
  page,
  onClose,
}: {
  collectionId: string;
  fileName: string;
  page: number;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const file = useQuery(filesQueries.document(collectionId, fileName));
  const objectUrl = useObjectUrl(file.data);

  useEffect(() => {
    if (!file.isError) return;
    toast(errorToast("Couldn't open the document", file.error, "It may have been deleted."));
    onClose();
  }, [file.isError, file.error, onClose, toast]);

  if (!objectUrl) return null;
  return (
    <PdfViewerDialog
      open
      onOpenChange={(next) => !next && onClose()}
      pdfUrl={objectUrl}
      fileName={fileName}
      initialPage={page}
    />
  );
}

/** An object URL for a blob, for viewers that can't send the Authorization header themselves. Made
 * and revoked inside one effect, so a StrictMode remount never hands the viewer a revoked URL. */
function useObjectUrl(blob: Blob | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return;
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => {
      URL.revokeObjectURL(next);
      setUrl(null);
    };
  }, [blob]);
  return url;
}
