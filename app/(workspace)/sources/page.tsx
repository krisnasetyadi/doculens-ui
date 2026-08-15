"use client";

import { SourcesPanel } from "@/components/workspace/sources-panel/sources-panel";
import { useWorkspaceStore } from "@/stores/workspace-store";

export default function SourcesPage() {
  const {
    selectedPdfCollections,
    selectedChatCollections,
    setPdfCollections,
    setChatCollections,
    setPublicLinkIds,
    setDbConnectionIds,
  } = useWorkspaceStore();

  return (
    <SourcesPanel
      selectedPdfCollections={selectedPdfCollections}
      selectedChatCollections={selectedChatCollections}
      onPdfCollectionsChange={setPdfCollections}
      onChatCollectionsChange={setChatCollections}
      onPublicLinkIdsChange={setPublicLinkIds}
      onDbConnectionIdsChange={setDbConnectionIds}
    />
  );
}
