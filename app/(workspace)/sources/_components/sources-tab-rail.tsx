"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Indicator = { left: number; width: number };

/** Segmented tabs in a hairline rail. One blue pill slides to the active tab. */
export function SourcesTabRail<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (id: T) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<Indicator | null>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const active = list.querySelector<HTMLElement>('[data-state="active"]');
      if (active) setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
    };
    measure();
    const frame = requestAnimationFrame(() => setReady(true));
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [value, tabs.length]);

  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as T)} className="mb-[19px] gap-0">
      <TabsList
        ref={listRef}
        className="no-scrollbar relative h-auto w-full max-w-full justify-start gap-0.5 sm:w-fit overflow-x-auto border bg-card p-1 text-muted-foreground shadow-xs"
      >
        {indicator && (
          <span
            aria-hidden="true"
            style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }}
            className={`pointer-events-none absolute inset-y-1 left-0 rounded-lg bg-accent ring-1 ring-inset ring-primary/20 ${
              ready ? "transition-[transform,width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none" : ""
            }`}
          />
        )}
        {tabs.map((t) => (
          <TabsTrigger
            key={t.id}
            value={t.id}
            className="relative z-10 h-9 flex-1 gap-2 sm:flex-none border-0 bg-transparent px-4 font-manrope text-[13px] font-bold text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none dark:data-[state=active]:border-0 dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-primary [&_svg]:size-[18px] max-[620px]:px-3.5 max-[420px]:[&_svg]:hidden"
          >
            {t.icon}
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
