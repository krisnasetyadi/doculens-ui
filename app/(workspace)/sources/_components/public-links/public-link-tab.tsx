import dayjs from "dayjs";
import { Loader2, Link2, Trash2, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
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
import { FormInlineError } from "@/components/forms/form-inline-error";
import { DANGER_ICON_BUTTON_CLASS } from "@/lib/danger-styles";
import { EmptyState } from "@/components/empty-state";
import { SortBar } from "../sort-bar";
import { SourceConnectionSkeleton } from "../source-connection-skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toggleSort } from "../../_lib/sort";
import type { usePublicLinkTab } from "../../_hooks/use-public-link-tab";
import {
  CARD_CLASS,
  TOOLBAR_CLASS,
  PRIMARY_BUTTON_CLASS,
  ROW_TITLE_CLASS,
  ROW_META_CLASS,
  CONNECTION_HEAD_CLASS,
  ROW_PANEL_CLASS,
  DIALOG_BUTTON_CLASS,
  DIALOG_PRIMARY_CLASS,
  DIALOG_TITLE_CLASS,
  FIELD_HINT_CLASS,
  FIELD_INPUT_CLASS,
  FIELD_LABEL_CLASS,
} from "@/lib/sources-ui";

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
      <div className={CARD_CLASS}>
        {loadingPublicLinks ? (
          <SourceConnectionSkeleton />
        ) : linkSources.length === 0 ? (
          <EmptyState
            icon={<Link2 />}
            heading="Your links will show up here"
            uploadIcon={<Link2 className="size-3.5" />}
            label="Add a Google Drive or public link whenever you're ready. Then you can ask your assistant about it."
            uploadLabel="Add link"
            onUpload={() => {
              setPdfLinkError(null);
              setPdfLinkDialogOpen(true);
            }}
          />
        ) : (
          <>
            <div className={TOOLBAR_CLASS}>
              <span className="mr-auto font-['Manrope'] text-[13px] font-bold text-foreground">All links</span>
              <SortBar
                sort={linkSort}
                onToggle={(k) => toggleSort(linkSort, k, setLinkSort)}
              />
              <Button
                onClick={() => {
                  setPdfLinkError(null);
                  setPdfLinkDialogOpen(true);
                }}
                className={PRIMARY_BUTTON_CLASS}
              >
                <Link2 className="size-3.5" />
                Add link
              </Button>
            </div>
            <div>
              {linkSources.map((link) => {
                const isActive = activePublicLinkIds.has(link.link_id);
                const isExpanded = expandedPublicLinks.includes(link.link_id);

                return (
                  <div key={link.link_id} className="border-b last:border-b-0">
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      className={CONNECTION_HEAD_CLASS}
                      onClick={() => togglePublicLinkExpansion(link.link_id)}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          togglePublicLinkExpansion(link.link_id);
                        }
                      }}
                    >
                      <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-accent" : "bg-muted"}`}>
                        <Link2 className={`size-[18px] ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={ROW_TITLE_CLASS} title={link.title}>
                          {link.title}
                        </p>
                        <p className={`${ROW_META_CLASS} truncate`} title={link.url}>
                          {link.url}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {link.item_count} items
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      )}
                    </div>

                    {isExpanded && (
                      <div className={ROW_PANEL_CLASS}>
                        <div className="flex items-center justify-between gap-2 px-1">
                          <p className="text-[11px] text-muted-foreground">
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
                              className={`size-7 rounded-md ${DANGER_ICON_BUTTON_CLASS}`}
                              aria-label="Delete link"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>

                        {link.items.length === 0 ? (
                          <p className="px-1 py-2 text-[11px] text-muted-foreground">
                            No extracted items yet.
                          </p>
                        ) : (
                          <div className="max-h-52 space-y-1.5 overflow-y-auto">
                            {link.items.map((item) => (
                              <a
                                key={item.id}
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="group flex items-center gap-3 rounded-lg border bg-card px-3 py-2 font-['Manrope'] text-xs font-medium text-foreground transition-colors hover:text-primary"
                              >
                                {item.item_type === "folder" ? (
                                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                                ) : (
                                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                                )}
                                <span className="min-w-0 flex-1 truncate" title={item.name}>{item.name}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={DIALOG_TITLE_CLASS}>
              Add Public Link Source
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <label className={FIELD_LABEL_CLASS}>
                Source title
              </label>
              <Input
                placeholder="Engineering Manuals"
                value={pdfSourceTitle}
                onChange={(e) => setPdfSourceTitle(e.target.value)}
                className={FIELD_INPUT_CLASS}
              />
              <p className={FIELD_HINT_CLASS}>
                Optional. This becomes the label shown in the sources list.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className={FIELD_LABEL_CLASS}>
                Public URL
              </label>
              <Input
                placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                value={pdfSourceUrl}
                onChange={(e) => {
                  setPdfSourceUrl(e.target.value);
                  if (pdfLinkError) setPdfLinkError(null);
                }}
                className={FIELD_INPUT_CLASS}
              />
              <p className={FIELD_HINT_CLASS}>
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
              className={DIALOG_BUTTON_CLASS}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConnectLinkOnly}
              disabled={savingPublicLink}
              className={DIALOG_PRIMARY_CLASS}
            >
              {savingPublicLink && <Loader2 className="size-3.5 animate-spin" />}
              {savingPublicLink ? "Saving..." : "Save Link Source"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
