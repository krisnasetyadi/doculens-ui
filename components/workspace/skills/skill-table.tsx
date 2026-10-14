import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SKELETON_TONE } from "@/lib/skeleton-tones";
import { Panel } from "@/components/panel";

// Shared by the real list and its skeleton so the frame, column header and
// row metrics can't drift apart: the skeleton only swaps what's inside the rows.
export function SkillTable({ children }: { children: ReactNode }) {
  return (
    <Panel className="overflow-hidden">
      <div className="hidden items-center justify-between gap-4 border-b border-border bg-muted/30 px-5 py-2 font-manrope text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground sm:flex">
        <span>Skill</span>
        <span className="flex items-center gap-6 pr-6">
          <span className="w-14">Access</span>
          <span className="w-14">Updated</span>
        </span>
      </div>
      {children}
    </Panel>
  );
}

// Tones mirror the real row: icon tile and slash-command chip are chips, the rest is text.
const { text: TEXT, chip: CHIP } = SKELETON_TONE;

export function SkillTableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status">
      <span className="sr-only">Loading skills…</span>
      <div aria-hidden="true">
        <SkillTable>
          <ul className="divide-y divide-border">
            {Array.from({ length: rows }, (_, index) => (
              <li key={index} className="flex items-center gap-3 px-5 py-3.5">
                <Skeleton className={cn("size-9 shrink-0", CHIP)} />
                <div className="min-w-0 flex-1">
                  {/* Real name: 13px bold, 19.5px line. */}
                  <div className="flex h-[19.5px] items-center">
                    <Skeleton className={cn("h-3.5", TEXT, index % 2 === 0 ? "w-1/3" : "w-1/4")} />
                  </div>
                  {/* Real second line: slash-command chip (10px mono, py-0.5 = 19px) then description. */}
                  <div className="mt-0.5 flex h-[19px] items-center gap-2">
                    <Skeleton className={cn("h-[19px] w-16 shrink-0", CHIP)} />
                    <Skeleton className={cn("h-3", TEXT, index % 2 === 0 ? "w-2/5" : "w-1/3")} />
                  </div>
                </div>
                <div className="hidden shrink-0 items-center gap-6 sm:flex">
                  <div className="w-14">
                    <Skeleton className={cn("h-[18px] w-12", CHIP)} />
                  </div>
                  <div className="w-14">
                    <Skeleton className={cn("h-3 w-10", TEXT)} />
                  </div>
                </div>
                <Skeleton className={cn("h-4 w-4 shrink-0", TEXT)} />
              </li>
            ))}
          </ul>
        </SkillTable>
      </div>
    </div>
  );
}
