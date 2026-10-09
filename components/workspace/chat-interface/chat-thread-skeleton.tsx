import { Skeleton } from "@/components/ui/skeleton";

// Loading state for an opening conversation: the thread as it will land, so the page doesn't jump
// when messages arrive. Shells are the real ones from chat-message.tsx (accent bubble with its
// squared corner, 36px avatar); only the text inside is a placeholder. Line boxes match the real
// type: 14px/1.55 in a user bubble, 15px/1.7 in an assistant answer.

function UserTurnSkeleton({ width }: { width: string }) {
  return (
    <div className="flex items-start justify-end gap-3 pl-[60px] max-[620px]:gap-2 max-[620px]:pl-6">
      <div
        className="min-w-0 rounded-xl rounded-br-sm border border-selected bg-accent px-4 py-[11px] max-[620px]:px-[13px] max-[620px]:py-2.5"
        style={{ width }}
      >
        <div className="flex h-[21.7px] items-center">
          <Skeleton className="h-3.5 w-full" />
        </div>
      </div>
      <Skeleton className="size-9 shrink-0 rounded-full max-[620px]:size-[31px]" />
    </div>
  );
}

function AssistantTurnSkeleton({ lines }: { lines: string[] }) {
  return (
    <div className="min-w-0 space-y-2.5">
      <div className="flex h-7 items-center gap-2">
        <Skeleton className="size-[18px] rounded-full" />
        <Skeleton className="h-2.5 w-36" />
      </div>
      <div>
        {lines.map((width, index) => (
          <div key={index} className="flex h-[25.5px] items-center">
            <Skeleton className="h-3.5" style={{ width }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** `framed` adds the thread column (same width and padding as the real one) for use outside the thread. */
export function ChatThreadSkeleton({
  label = "Restoring conversation…",
  framed = false,
}: {
  label?: string;
  framed?: boolean;
}) {
  const turns = (
    <div role="status" className="space-y-7">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-7">
        <UserTurnSkeleton width="38%" />
        <AssistantTurnSkeleton lines={["100%", "94%", "98%", "62%"]} />
        <UserTurnSkeleton width="52%" />
        <AssistantTurnSkeleton lines={["97%", "100%", "71%"]} />
      </div>
    </div>
  );
  if (!framed) return turns;
  return (
    <div className="h-full overflow-hidden">
      <div className="mx-auto w-full max-w-[calc(920px_+_2*clamp(24px,8vw,120px))] px-4 py-6 sm:px-[clamp(24px,8vw,120px)] sm:py-10">
        {turns}
      </div>
    </div>
  );
}
