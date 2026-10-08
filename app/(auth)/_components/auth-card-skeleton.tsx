import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SKELETON_TONE } from "@/lib/skeleton-tones";
import { cn } from "@/lib/utils";

// Page fallback for the login and register cards, shown while the search params resolve. The title
// and description are static, so they render for real; the fields, button and links are placeholders
// in the measured sizes of the real card (416px wide): a field block is a 14px label, an 8px gap and
// a 36px input (58px), the button is 36px, and the two footer lines are 20px and 16px.

/** Heights of the field blocks; a field with a hint under it is taller (register's password). */
export const LOGIN_FIELDS = [58, 58];
export const REGISTER_FIELDS = [58, 58, 86, 58];

export function AuthCardSkeleton({
  title,
  description,
  fields,
  label,
}: {
  title: string;
  description: string;
  fields: number[];
  label: string;
}) {
  return (
    <Card
      role="status"
      aria-busy="true"
      className="border-border/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]"
    >
      <span className="sr-only">{label}</span>
      <CardHeader>
        <CardTitle className="font-manrope text-2xl font-extrabold text-foreground">{title}</CardTitle>
        <CardDescription className="font-inter">{description}</CardDescription>
      </CardHeader>
      <div aria-hidden="true" className="space-y-6">
        <CardContent className="space-y-4">
          {fields.map((height, index) => (
            <div key={index} className="grid gap-2" style={{ height }}>
              <div className="flex h-3.5 items-center">
                <Skeleton className={cn("h-[7px]", index % 2 === 0 ? "w-10" : "w-16")} />
              </div>
              {/* The input box is real chrome, not data: a plain bordered shape. */}
              <div className="h-9 rounded-md border border-input" />
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Skeleton className={cn("h-9 w-full rounded-xl", SKELETON_TONE.chip)} />
          <div className="flex h-5 items-center">
            <Skeleton className="h-[9px] w-[216px]" />
          </div>
          <div className="flex h-4 items-center">
            <Skeleton className="h-[7px] w-[151px]" />
          </div>
        </CardFooter>
      </div>
    </Card>
  );
}
