"use client";

import { SourcesPanel } from "@/components/sources-panel";
import { useWorkspaceStore } from "@/stores/workspace-store";

export default function SourcesPage() {
  const {
    selectedPdfCollections,
    selectedChatCollections,
    setPdfCollections,
    setChatCollections,
  } = useWorkspaceStore();

  return (
    <SourcesPanel
      selectedPdfCollections={selectedPdfCollections}
      selectedChatCollections={selectedChatCollections}
      onPdfCollectionsChange={setPdfCollections}
      onChatCollectionsChange={setChatCollections}
    />
  );
}
