import { Separator } from "@/components/ui/separator";
import { formatDayHeading } from "@/lib/date";

/** Opens each new day in a chat thread: the day and the time of its first message, centred between
 * two hairlines (MS-909). */
export function DayDivider({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Separator className="flex-1" />
      <time dateTime={value} className="shrink-0 whitespace-nowrap font-inter text-xs font-medium text-muted-foreground">
        {formatDayHeading(value)}
      </time>
      <Separator className="flex-1" />
    </div>
  );
}
