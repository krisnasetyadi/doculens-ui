import { AlertCircle } from "lucide-react";

export function FormInlineError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}
