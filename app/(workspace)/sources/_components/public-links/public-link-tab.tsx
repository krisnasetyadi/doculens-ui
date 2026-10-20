import { useState } from "react";
import { formatDateTime } from "@/lib/date";
import { Link2, Trash2, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/empty-state";
import { ConnectionToolbar } from "../connection-toolbar";
import { SourceConnectionSkeleton } from "../source-connection-skeleton";
import { PublicLinkDialog } from "./public-link-dialog";
import { toggleSort } from "../../_lib/sort";
import type { usePublicLinkTab } from "../../_hooks/use-public-link-tab";
import {
  TAB_PANEL_CLASS,
  ROW_TITLE_CLASS,
  ROW_META_CLASS,
  CONNECTION_HEAD_CLASS,
  ROW_PANEL_CLASS,
} from "../sources-ui";
import { IconButton } from "@/components/icon-button";
import { TruncatedTooltip } from "@/components/truncated-tooltip";
import { IconTile } from "@/components/icon-tile";

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
    savingPublicLink,
    saveLink,
    deletePublicLink,
    togglePublicLinkActive,
    togglePublicLinkExpansion,
  } = tab;
  // The link the trash button was pressed on; a delete is confirmed before it runs. The target is kept
  // after the dialog closes so its text does not blank out while it fades.
  const [deleteTarget, setDeleteTarget] = useState<(typeof linkSources)[number] | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      {active && (
      <div className={TAB_PANEL_CLASS}>
        {loadingPublicLinks && linkSources.length === 0 ? (
          <SourceConnectionSkeleton
            label="Loading links…"
            title="All links"
            toolbar={
              <>
                <Button disabled className="max-sm:flex-1">
                  <Link2 className="size-3.5" />
                  Add link
                </Button>
              </>
            }
          />
        ) : linkSources.length === 0 ? (
          <EmptyState
            icon={Link2}
            heading="Your links will show up here"
            description="Add a Google Drive or public link whenever you're ready. Then you can ask your assistant about it."
            action={{
              label: "Add link",
              icon: Link2,
              onClick: () => setPdfLinkDialogOpen(true),
            }}
          />
        ) : (
          <>
            <ConnectionToolbar
              title="All links"
              sort={linkSources.length > 1 ? linkSort : undefined}
              onSort={(k) => toggleSort(linkSort, k, setLinkSort)}
              action={
                <Button
                  onClick={() => setPdfLinkDialogOpen(true)}
                  className="max-sm:flex-1"
                >
                  <Link2 className="size-3.5" />
                  Add link
                </Button>
              }
            />
            <div>
              {linkSources.map((link) => {
                const isActive = activePublicLinkIds.has(link.link_id);
                const isExpanded = expandedPublicLinks.includes(link.link_id);

                return (
                  <div key={link.link_id}>
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
                      <IconTile tone={isActive ? "accent" : "muted"}>
                        <Link2 className={`size-[18px] ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      </IconTile>
                      <div className="min-w-0 flex-1">
                        <TruncatedTooltip label={link.title}>
                          <p className={ROW_TITLE_CLASS}>{link.title}</p>
                        </TruncatedTooltip>
                        <TruncatedTooltip label={link.url}>
                          <p className={`${ROW_META_CLASS} truncate`}>{link.url}</p>
                        </TruncatedTooltip>
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
                            Added {formatDateTime(link.created_at)}
                          </p>
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={isActive}
                              onCheckedChange={(checked) => togglePublicLinkActive(link.link_id, checked)}
                              aria-label={isActive ? "Deactivate link" : "Activate link"}
                            />
                            <IconButton
                              danger
                              size="sm"
                              label="Delete link"
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(link); setDeleteOpen(true); }}
                            >
                              <Trash2 className="size-3.5" />
                            </IconButton>
                          </div>
                        </div>

                        {link.items.length === 0 ? (
                          <EmptyState
                            size="compact"
                            icon={Link2}
                            heading="No extracted items yet"
                            description="Items found in this link will appear here."
                          />
                        ) : (
                          <div className="max-h-52 space-y-1.5 overflow-y-auto">
                            {link.items.map((item) => (
                              <a
                                key={item.id}
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="group flex items-center gap-3 rounded-lg border bg-card px-3 py-2 font-manrope text-xs font-medium text-foreground transition-colors hover:text-primary"
                              >
                                {item.item_type === "folder" ? (
                                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                                ) : (
                                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                                )}
                                <TruncatedTooltip label={item.name}>
                                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                                </TruncatedTooltip>
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

      <PublicLinkDialog
        open={pdfLinkDialogOpen}
        onOpenChange={setPdfLinkDialogOpen}
        saving={savingPublicLink}
        onSave={saveLink}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this link?"
        description={`"${deleteTarget?.title ?? ""}" will be removed from your sources and can no longer be used to answer questions.`}
        onConfirm={() => deletePublicLink(deleteTarget!.link_id)}
      />
    </>
  );
}
