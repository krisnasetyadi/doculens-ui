"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChatInterface } from "@/components/chat-interface";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Loader2 } from "lucide-react";

// Inner component reads search params (must be inside Suspense)
function AskInner() {
  const searchParams = useSearchParams();
  const { selectedPdfCollections, selectedChatCollections, selectedPublicLinkIds, selectedDbConnectionIds } =
    useWorkspaceStore();
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [initialSessionId, setInitialSessionId] = useState<string | undefined>();

  useEffect(() => {
    const q = searchParams.get("q");
    const sid = searchParams.get("session_id");
    if (sid) {
      // Resume existing session from backend
      setInitialSessionId(sid);
    } else if (q) {
      setPendingQuestion(decodeURIComponent(q));
    }
  }, [searchParams]);

  return (
    <ChatInterface
      selectedPdfCollections={selectedPdfCollections}
      selectedChatCollections={selectedChatCollections}
      selectedPublicLinkIds={selectedPublicLinkIds}
      selectedDbConnectionIds={selectedDbConnectionIds}
      pendingQuestion={pendingQuestion}
      onPendingQuestionConsumed={() => setPendingQuestion("")}
      initialSessionId={initialSessionId}
    />
  );
}

export default function AskPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm font-['Inter']">Loading…</span>
        </div>
      }
    >
      <AskInner />
    </Suspense>
  );
}
