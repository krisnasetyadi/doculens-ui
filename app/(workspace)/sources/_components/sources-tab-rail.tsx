"use client";

import type { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Segmented tabs in a soft rail. The active tab is a white raised chip. */
export function SourcesTabRail<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as T)} className="mb-[31px] gap-0">
      <TabsList className="no-scrollbar h-auto w-full max-w-full justify-start gap-1 overflow-x-auto rounded-xl border border-border/50 bg-muted/60 p-1 shadow-none sm:w-fit">
        {tabs.map((t) => (
          <TabsTrigger
            key={t.id}
            value={t.id}
            // Under 520px the icons go and the padding tightens, so all four labels fit one row at 360px.
            // Locked geometry: every tab has the same border in every state and only colours transition, so switching tabs moves nothing.
            className="h-auto min-h-10 flex-1 gap-2 rounded-xl border border-transparent px-5 py-2 text-sm font-bold text-muted-foreground shadow-none transition-[color,background-color,border-color,box-shadow] hover:text-foreground data-[state=active]:border-border/60 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm dark:data-[state=active]:border-border/60 dark:data-[state=active]:bg-card dark:data-[state=active]:text-primary sm:flex-none [&_svg:not([class*='size-'])]:size-6 max-[620px]:px-3 max-[520px]:[&_svg]:hidden"
          >
            {t.icon}
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
