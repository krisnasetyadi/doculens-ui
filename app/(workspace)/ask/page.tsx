"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChatInterface } from "@/components/workspace/chat-interface/chat-interface";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Loader2 } from "lucide-react";

// Inner component reads search params (must be inside Suspense)
function AskInner() {
  const searchParams = useSearchParams();
  const { selectedPdfCollections, selectedChatCollections, selectedPublicLinkIds, selectedDbConnectionIds } =
    useWorkspaceStore();
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [initialSessionId, setInitialSessionId] = useState<string | undefined>();
  // MS-417: set when arriving from a search result whose match was inside a
  // message, so the thread can open on that message rather than at the top.
  const [initialMessageId, setInitialMessageId] = useState<string | undefined>();
  // The search query that produced that jump, so the term can be marked in
  // the message once it's on screen. Not `q` — see openSession() in
  // chat-search-dialog.tsx for why that name is taken.
  const [initialMatchQuery, setInitialMatchQuery] = useState<string | undefined>();

  useEffect(() => {
    const q = searchParams.get("q");
    const sid = searchParams.get("session_id");
    setInitialMessageId(searchParams.get("message_id") ?? undefined);
    setInitialMatchQuery(searchParams.get("match") ?? undefined);
    if (sid) {
      // Resume existing session from backend
      setInitialSessionId(sid);
    } else {
      // Bare /ask (e.g. clicking the "Workspace" nav item while a session
      // was open) — stop pointing at whatever was loaded before.
      setInitialSessionId(undefined);
      if (q) setPendingQuestion(decodeURIComponent(q));
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
      initialMessageId={initialMessageId}
      initialMatchQuery={initialMatchQuery}
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
