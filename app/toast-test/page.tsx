"use client";

import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

/** Scratch page for eyeballing toast variants — visit /toast-test, not linked from anywhere. */
export default function ToastTestPage() {
  const { toast } = useToast();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 bg-background">
      <h1 className="font-['Manrope'] text-2xl font-extrabold text-foreground mb-2">Toast playground</h1>

      <div className="flex flex-wrap items-center justify-center gap-3 max-w-md">
        <Button
          onClick={() =>
            toast({
              variant: "default",
              title: "Heads up",
              description: "This is the default/info style toast.",
            })
          }
        >
          Default
        </Button>

        <Button
          className="bg-green-600 hover:bg-green-600/90 text-white"
          onClick={() =>
            toast({
              variant: "success",
              title: "Saved successfully",
              description: "Your changes have been saved.",
            })
          }
        >
          Success
        </Button>

        <Button
          variant="destructive"
          onClick={() =>
            toast({
              variant: "destructive",
              title: "Something went wrong",
              description: "Could not save your changes. Please try again.",
            })
          }
        >
          Error
        </Button>

        <Button
          className="bg-amber-500 hover:bg-amber-500/90 text-white"
          onClick={() =>
            toast({
              variant: "warning",
              title: "Heads up",
              description: "You're approaching your storage limit.",
            })
          }
        >
          Warning
        </Button>

        <Button
          variant="outline"
          onClick={() =>
            toast({
              variant: "destructive",
              title: "Delete this file?",
              description: "This action can't be undone.",
              action: (
                <ToastAction altText="Undo delete" onClick={() => toast({ variant: "success", title: "Deleted" })}>
                  Undo
                </ToastAction>
              ),
            })
          }
        >
          With action
        </Button>

        <Button
          variant="outline"
          onClick={() =>
            toast({
              variant: "default",
              title: "No description",
            })
          }
        >
          Title only
        </Button>
      </div>
    </div>
  );
}
