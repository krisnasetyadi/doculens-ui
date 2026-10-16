import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Database, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/forms/form-field";
import { FormFieldset } from "@/components/forms/form-fieldset";
import { FormInput } from "@/components/forms/form-input";
import { IconButton } from "@/components/icon-button";
import { databaseConnectionSchema, type DatabaseConnectionValues } from "../../_lib/source-forms";

const EMPTY: DatabaseConnectionValues = { label: "", url: "" };

/** Sources → Database → Connect. `onConnect` resolves to a message for the URL field when the server
 * refused the URL, or null when it connected (the caller closes the dialog) or showed a toast. */
export function DatabaseConnectDialog({
  open,
  onOpenChange,
  connecting,
  onConnect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connecting: boolean;
  onConnect: (values: DatabaseConnectionValues) => Promise<string | null>;
}) {
  const [urlVisible, setUrlVisible] = useState(false);
  const form = useForm<DatabaseConnectionValues>({
    resolver: zodResolver(databaseConnectionSchema),
    defaultValues: EMPTY,
  });

  // Every opening starts clean: no values left from last time, no messages, the URL hidden again.
  useEffect(() => {
    if (!open) return;
    form.reset(EMPTY);
    setUrlVisible(false);
  }, [open, form]);

  const submit = form.handleSubmit(async (values) => {
    const urlError = await onConnect(values);
    if (urlError) form.setError("url", { message: urlError }, { shouldFocus: true });
  });

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!connecting) onOpenChange(next); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Connect Database
          </DialogTitle>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="contents">
          <FormFieldset busy={connecting}>
            <div className="space-y-3 py-1">
              <FormInput
                control={form.control}
                name="label"
                label="Label"
                placeholder="Analytics DB"
                description="Optional. Derived from the host if left blank."
              />
              <FormField
                control={form.control}
                name="url"
                label="PostgreSQL connection URL"
                description="Your own database, used as a real-time knowledge source, separate from the app's own storage. This contains a password, so keep it hidden on shared screens."
                render={(field) => (
                  <div className="relative">
                    <Input
                      {...field}
                      type={urlVisible ? "text" : "password"}
                      placeholder="postgresql://user:pass@host:5432/dbname"
                      className="pr-9 font-mono"
                      autoComplete="off"
                    />
                    <IconButton
                      size="sm"
                      type="button"
                      label={urlVisible ? "Hide connection URL" : "Show connection URL"}
                      onClick={() => setUrlVisible((v) => !v)}
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                    >
                      {urlVisible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </IconButton>
                  </div>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={connecting} loadingText="Connecting…" icon={<Database className="size-3.5" />}>
                Connect
              </Button>
            </DialogFooter>
          </FormFieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
