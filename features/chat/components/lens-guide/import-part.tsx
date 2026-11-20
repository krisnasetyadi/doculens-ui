"use client";

import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/panel";
import { pdfCollectionsMutations } from "@/services/pdf-collections/handler/pdf-collections.queries";
import { ChoiceChip } from "./choice-chip";
import type { GuidePartProps } from "./guide-block";
import { MaterialIcon } from "./material-icon";

// MS-1181: a public Google Drive link pasted in the chat. Imported only when
// the user clicks, through the existing upload-from-urls, with its own quota
// and size checks; the new collection is then searched like any other.

export function ImportPart({ guide, active, onPick }: GuidePartProps) {
  const upload = useMutation(pdfCollectionsMutations.uploadFromUrls());
  const link = guide.import_link;
  if (!link) return null;

  const done = upload.data;
  const name = done ? done.title || done.file_names?.[0] || "dokumen ini" : link.title || "Folder Google Drive";
  const status = done
    ? `Selesai. ${done.file_count} file sudah masuk ke Sources.`
    : upload.isPending
      ? `Mengimpor dan memproses ${link.file_count} PDF. Ini bisa makan beberapa menit.`
      : `Google Drive publik · ${link.file_count} PDF`;

  return (
    <Panel padding="md" className="space-y-3 px-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60">
          <MaterialIcon name={done ? "check_circle" : "add_link"} size={22} fill={!!done} className="text-primary-pressed dark:text-primary" />
        </div>
        <div className="min-w-0 flex-1 basis-48 space-y-0.5">
          <p className="font-manrope text-[15px] font-bold leading-snug text-foreground [overflow-wrap:anywhere]">{name}</p>
          <p className="font-inter text-[13px] text-muted-foreground" aria-live="polite">{status}</p>
        </div>
        {!done && (
          <Button
            size="sm"
            disabled={!active}
            loading={upload.isPending}
            loadingText="Mengimpor…"
            icon={<MaterialIcon name="download" size={18} />}
            onClick={() => upload.mutate({ urls: link.urls, title: link.title ?? undefined })}
          >
            Impor ke Sources
          </Button>
        )}
      </div>
      {done?.notice && <p className="font-inter text-[13px] text-muted-foreground">{done.notice}</p>}
      {upload.isError && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 font-inter text-[13px] text-destructive">
          {upload.error.message || "Impor gagal. Coba lagi."}
        </p>
      )}
      {done && (
        <ChoiceChip onClick={() => onPick(`Saya mau mulai dari dokumen ${name}. Apa yang perlu saya baca dulu?`)}>
          Mulai dari dokumen ini
        </ChoiceChip>
      )}
    </Panel>
  );
}
