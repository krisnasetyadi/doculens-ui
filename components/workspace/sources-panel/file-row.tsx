import { Trash2, ChevronRight, ChevronDown, ExternalLink, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StatusIcon } from "./status-icon";
import { API_BASE, type SourceFile } from "./sources-types";

export function FileRow({
  file,
  onDelete,
  isPdf = false,
  onPreview,
  onToggleExpand,
  expanded,
  onToggleActive,
}: {
  file: SourceFile;
  onDelete: () => void;
  isPdf?: boolean;
  onPreview?: () => void;
  onToggleExpand?: () => void;
  expanded?: boolean;
  onToggleActive?: () => void;
}) {
  const isInactive = file.status === "success" && file.active === false;
  const accent =
    file.status === "uploading" ? "bg-primary" : file.status === "error" ? "bg-red-400" : isInactive ? "bg-muted-foreground/30" : "bg-emerald-500";
  const iconWrap =
    file.status === "uploading" ? "bg-primary/10" : file.status === "error" ? "bg-red-500/10" : isInactive ? "bg-muted" : "bg-emerald-500/10";

  return (
    <div className="relative flex items-center gap-3 pl-4 pr-4 py-3 rounded-xl bg-card hover:bg-muted/30 group transition-colors border border-border/60 overflow-hidden">
      <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${accent}`} />
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${iconWrap}`}>
        <StatusIcon status={file.status} />
      </div>
      <div className="flex-1 min-w-0">
        {isPdf && file.status === "success" && file.rawFileName ? (
          <button
            onClick={() => {
              if (file.collectionId && file.rawFileName) {
                const url = `${API_BASE}/api/v1/files/${file.collectionId}/${encodeURIComponent(file.rawFileName)}`;
                window.open(url, "_blank");
              }
            }}
            className="w-full min-w-0 text-sm font-semibold font-['Manrope'] text-foreground hover:text-primary hover:underline transition-colors text-left flex items-center gap-1.5 focus:outline-none"
            title={file.name}
          >
            <ExternalLink className="h-3 w-3 shrink-0 inline opacity-70 text-primary" />
            <span className="truncate flex-1 min-w-0" title={file.name}>{file.name}</span>
          </button>
        ) : isPdf && file.linkedItems?.length ? (
          <button
            onClick={onToggleExpand}
            className="w-full min-w-0 text-sm font-semibold font-['Manrope'] text-foreground hover:text-primary transition-colors text-left flex items-center gap-1.5 focus:outline-none"
            title={file.name}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-primary shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
            <span className="truncate flex-1 min-w-0" title={file.name}>{file.name}</span>
          </button>
        ) : onPreview ? (
          <button
            onClick={onPreview}
            className="w-full min-w-0 text-sm font-semibold font-['Manrope'] text-foreground hover:text-primary hover:underline transition-colors text-left flex items-center gap-1.5 focus:outline-none"
            title={`Preview ${file.name}`}
          >
            <span className="truncate flex-1 min-w-0" title={file.name}>{file.name}</span>
            <Eye className="h-3 w-3 shrink-0 inline opacity-0 group-hover:opacity-70 transition-opacity text-primary" />
          </button>
        ) : (
          <p className="text-sm font-semibold font-['Manrope'] text-foreground truncate" title={file.name}>
            {file.name}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {file.kind && (
            <span className="text-[10px] font-['Inter'] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {file.kind === "pdf" ? "PDF" : "WhatsApp"}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground/60 font-['Inter']">
            {file.uploadedAt.format("DD MMM YYYY, HH:mm")}
          </span>
          {file.status === "success" && file.meta && (
            <span className="text-[10px] font-['Inter'] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/60">
              {file.meta}
            </span>
          )}
          {file.status === "success" && file.linkedItems && file.linkedItems.length > 0 && (
            <span className="text-[10px] font-['Inter'] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/60">
              {file.linkedItems.length} linked
            </span>
          )}
          {file.status === "error" && (
            <span className="text-[11px] text-red-400 font-['Inter']">Upload failed</span>
          )}
        </div>
      </div>
      {onToggleActive && (
        <Switch
          checked={file.active !== false}
          onCheckedChange={onToggleActive}
          className="shrink-0"
          aria-label={file.active !== false ? "Deactivate source" : "Activate source"}
        />
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-8 w-8 rounded-full shrink-0 text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10"
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-['Manrope'] font-extrabold">
              Do you want to delete this file?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-['Inter']">
              {`"${file.name}" will be removed from your sources and can no longer be used to answer questions.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-['Manrope'] font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-['Manrope'] font-bold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
