"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChatInterface } from "@/components/chat-interface";
import { useWorkspaceStore } from "@/stores/workspace-store";

// Inner component reads search params (must be inside Suspense)
function AskInner() {
  const searchParams = useSearchParams();
  const { selectedPdfCollections, selectedChatCollections } =
    useWorkspaceStore();
  const [pendingQuestion, setPendingQuestion] = useState("");

  // On mount, pick up ?q= from the URL (e.g. navigated from home page)
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setPendingQuestion(decodeURIComponent(q));
  }, [searchParams]);

  return (
    <ChatInterface
      selectedPdfCollections={selectedPdfCollections}
      selectedChatCollections={selectedChatCollections}
      pendingQuestion={pendingQuestion}
      onPendingQuestionConsumed={() => setPendingQuestion("")}
    />
  );
}

export default function AskPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full text-[#566166]">
          <span className="material-symbols-outlined animate-spin text-3xl text-[#0053db]">
            progress_activity
          </span>
        </div>
      }
    >
      <AskInner />
    </Suspense>
  );
}
