import dayjs from "dayjs";
import { Loader2, Link2, Trash2, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FormInlineError } from "@/components/forms/form-inline-error";
import { EmptyState } from "./empty-state";
import { SortBar } from "./sort-bar";
import { toggleSort } from "./sources-types";
import type { usePublicLinkTab } from "@/hooks/use-public-link-tab";

export function PublicLinkTab({ tab, active }: { tab: ReturnType<typeof usePublicLinkTab>; active: boolean }) {
  const {
    loadingPublicLinks,
    linkSources,
    activePublicLinkIds,
    expandedPublicLinks,
    linkSort,
    setLinkSort,
    pdfLinkDialogOpen,
    setPdfLinkDialogOpen,
    pdfSourceUrl,
    setPdfSourceUrl,
    pdfSourceTitle,
    setPdfSourceTitle,
    pdfLinkError,
    setPdfLinkError,
    savingPublicLink,
    handleConnectLinkOnly,
    deletePublicLink,
    togglePublicLinkActive,
    togglePublicLinkExpansion,
  } = tab;

  return (
    <>
      {active && (
      <div className="rounded-2xl border border-border/60 bg-card shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)] p-4 sm:p-6">
        {loadingPublicLinks ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground/40" />
          </div>
        ) : linkSources.length === 0 ? (
          <EmptyState
            icon={<span className="material-symbols-outlined text-5xl leading-none">link</span>}
            label="Attach Google Drive / public links as sources"
            uploadLabel="Add Link"
            onUpload={() => {
              setPdfLinkError(null);
              setPdfLinkDialogOpen(true);
            }}
          />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <SortBar
                sort={linkSort}
                onToggle={(k) => toggleSort(linkSort, k, setLinkSort)}
              />
              <Button
                onClick={() => {
                  setPdfLinkError(null);
                  setPdfLinkDialogOpen(true);
                }}
                className="w-full sm:w-auto h-11 sm:h-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-bold gap-1.5 shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all text-sm sm:text-xs sm:shrink-0"
              >
                <Link2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                Add Link
              </Button>
            </div>
            <div className="space-y-3">
              <Accordion type="multiple" value={expandedPublicLinks} className="space-y-3">
                {linkSources.map((link) => {
                  const isActive = activePublicLinkIds.has(link.link_id);

                  return (
                    <AccordionItem
                      key={link.link_id}
                      value={link.link_id}
                      className="relative overflow-hidden rounded-xl bg-card border border-border/60 px-4"
                    >
                      <span
                        className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${isActive ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                      />
                      <AccordionTrigger
                        className="-mx-4 px-4 py-3 rounded-xl hover:bg-muted/30 hover:no-underline transition-colors"
                        onClick={() => togglePublicLinkExpansion(link.link_id)}
                      >
                        <div className="flex items-center gap-3 min-w-0 w-full">
                          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isActive ? "bg-emerald-500/10" : "bg-muted"}`}>
                            <span className={`material-symbols-outlined text-[16px] ${isActive ? "text-emerald-500" : "text-muted-foreground/50"}`}>link</span>
                          </div>
                          <div className="min-w-0 flex-1 text-left">
                            <p className="text-sm font-bold font-['Manrope'] text-foreground truncate" title={link.title}>
                              {link.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground/60 font-['Inter'] truncate" title={link.url}>
                              {link.url}
                            </p>
                          </div>
                          <span className="shrink-0 text-[10px] font-['Inter'] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/60">
                            {link.item_count} items
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-0 pb-3">
                        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] text-muted-foreground/60 font-['Inter']">
                              Added {dayjs(link.created_at).format("DD MMM YYYY, HH:mm")}
                            </p>
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={isActive}
                                onCheckedChange={(checked) => togglePublicLinkActive(link.link_id, checked)}
                                aria-label={isActive ? "Deactivate link" : "Activate link"}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deletePublicLink(link.link_id)}
                                className="h-7 w-7 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          {link.items.length === 0 ? (
                            <p className="text-xs text-muted-foreground/60 font-['Inter']">
                              No extracted items yet.
                            </p>
                          ) : (
                            <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                              {link.items.map((item) => (
                                <a
                                  key={item.id}
                                  href={item.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                                >
                                  {item.item_type === "folder" ? (
                                    <ChevronRight className="h-3 w-3" />
                                  ) : (
                                    <ExternalLink className="h-3 w-3" />
                                  )}
                                  <span className="truncate" title={item.name}>{item.name}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </>
        )}
      </div>
      )}

      <Dialog
        open={pdfLinkDialogOpen}
        onOpenChange={(open) => {
          setPdfLinkDialogOpen(open);
          if (!open) {
            setPdfLinkError(null);
            setPdfSourceUrl("");
            setPdfSourceTitle("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg font-['Inter']">
          <DialogHeader>
            <DialogTitle className="font-['Manrope'] font-extrabold text-foreground">
              Add Public Link Source
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold font-['Manrope'] text-muted-foreground">
                Source title
              </label>
              <Input
                placeholder="Engineering Manuals"
                value={pdfSourceTitle}
                onChange={(e) => setPdfSourceTitle(e.target.value)}
                className="h-9 text-sm"
              />
              <p className="text-[11px] text-muted-foreground/60 font-['Inter'] leading-5">
                Optional. This becomes the label shown in the sources list.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold font-['Manrope'] text-muted-foreground">
                Public URL
              </label>
              <Input
                placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                value={pdfSourceUrl}
                onChange={(e) => {
                  setPdfSourceUrl(e.target.value);
                  if (pdfLinkError) setPdfLinkError(null);
                }}
                className="h-9 text-sm"
              />
              <p className="text-[11px] text-muted-foreground/60 font-['Inter'] leading-5">
                Supports public Google Drive links and other publicly accessible URLs.
              </p>
            </div>

            {pdfLinkError && <FormInlineError message={pdfLinkError} />}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPdfLinkDialogOpen(false);
                setPdfLinkError(null);
                setPdfSourceUrl("");
                setPdfSourceTitle("");
              }}
              className="rounded-xl font-['Manrope'] font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConnectLinkOnly}
              disabled={savingPublicLink}
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-bold gap-2 shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all"
            >
              {savingPublicLink && <Loader2 className="h-4 w-4 animate-spin" />}
              {savingPublicLink ? "Saving..." : "Save Link Source"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
