"use client";

import { useState, type ComponentProps } from "react";
import type { PdfSourceInfo } from "@/services/types";
import { TextPreviewDialog, type TextPreviewSource } from "@/features/sources/components/text-preview-dialog";
import { guideSourceFromUrl, isSlideDeck } from "@/features/chat/lib/guide-source-link";

/** A cited deck as the slide preview opens it. */
export function deckPreview(source: PdfSourceInfo): TextPreviewSource {
  return { collectionId: source.collection_id, fileName: source.file_name, slide: source.page, fileUrl: source.file_url };
}

/** Open saved guide citations through authenticated viewers without leaving the chat. */
export function GuideSourceLink({ href, children, onOpenSource, ...props }: ComponentProps<"a"> & {
  onOpenSource?: (source: PdfSourceInfo) => void;
}) {
  const [deck, setDeck] = useState<TextPreviewSource | null>(null);
  const source = guideSourceFromUrl(href, process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000");
  if (!source) return <a {...props} href={href}>{children}</a>;
  if (!onOpenSource && !isSlideDeck(source.file_name)) return <span>{children}</span>;
  return (
    <>
      <a {...props} href={href} onClick={(event) => {
        event.preventDefault();
        if (isSlideDeck(source.file_name)) {
          setDeck(deckPreview(source));
        } else {
          onOpenSource?.(source);
        }
      }}>{children}</a>
      <TextPreviewDialog source={deck} onClose={() => setDeck(null)} />
    </>
  );
}
