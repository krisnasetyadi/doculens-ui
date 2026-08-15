import {
  ExternalLink,
  Eye,
  ChevronDown,
  FileText,
  Database,
  MessageSquare,
  Users,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PdfSourceInfo } from "@/services";
import type { Message } from "./chat-types";

export function SourcesSection({
  message,
  onOpenPdfViewer,
}: {
  message: Message;
  onOpenPdfViewer: (s: PdfSourceInfo) => void;
}) {
  const { sources } = message;
  if (!sources) return null;
  const hasPdfDetailed = (sources.pdf_sources_detailed?.length ?? 0) > 0;
  const hasPdfSimple = !hasPdfDetailed && (sources.pdf_sources?.length ?? 0) > 0;
  const hasDb = Object.keys(sources.db_results ?? {}).length > 0;
  const hasChat = (sources.chat_results?.length ?? 0) > 0;
  if (!hasPdfDetailed && !hasPdfSimple && !hasDb && !hasChat) return null;

  return (
    <div className="pl-1">
      <p className="text-[11px] font-bold font-['Manrope'] uppercase tracking-[0.2em] text-muted-foreground/50 mb-2">
        Sources
      </p>
      <div className="flex flex-wrap gap-2">
      {hasPdfDetailed && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button className="group flex items-center gap-2 px-3 py-2 rounded-full border border-border/60 bg-muted/50 hover:bg-muted hover:border-primary/30 transition-all text-[11px] font-['Manrope'] font-bold text-muted-foreground hover:text-foreground w-auto">
              <FileText className="h-3.5 w-3.5 text-primary" />
              {sources.pdf_sources_detailed!.length} PDF source{sources.pdf_sources_detailed!.length !== 1 ? 's' : ''}
              <ChevronDown className="h-3 w-3 ml-1 transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 bg-card border border-border/60 rounded-xl p-4 space-y-3">
              {sources.pdf_sources_detailed!.map((src, idx) => (
                <div key={idx} className="flex flex-col gap-1.5 pb-3 border-b border-border/40 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {src.page_url ? (
                      <a href={src.page_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                        {src.file_name} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs font-semibold text-foreground">{src.file_name}</span>
                    )}
                  </div>
                  {src.content_preview && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 pl-5 italic">{src.content_preview}</p>
                  )}
                  <div className="flex items-center gap-1.5 pl-5 flex-wrap">
                    {src.page && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">p.{src.page}</span>
                    )}
                    {src.relevance_score && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{(src.relevance_score * 100).toFixed(0)}% match</span>
                    )}
                    {src.file_url && (
                      <button onClick={() => onOpenPdfViewer(src)} className="text-[10px] text-primary hover:bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors font-semibold">
                        <Eye className="h-3 w-3" /> View
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {hasPdfSimple && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button className="group flex items-center gap-2 px-3 py-2 rounded-full border border-border/60 bg-muted/50 hover:bg-muted hover:border-primary/30 transition-all text-[11px] font-['Manrope'] font-bold text-muted-foreground hover:text-foreground w-auto">
              <FileText className="h-3.5 w-3.5 text-primary" />
              {sources.pdf_sources!.length} PDF source{sources.pdf_sources!.length !== 1 ? 's' : ''}
              <ChevronDown className="h-3 w-3 ml-1 transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 bg-card border border-border/60 rounded-xl p-4 space-y-2">
              {sources.pdf_sources!.map((src, idx) => (
                <p key={idx} className="text-xs text-foreground font-medium pb-2 border-b border-border/40 last:border-0 last:pb-0">{src}</p>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {hasDb && Object.entries(sources.db_results!).map(([tableName, result]) => (
        <Collapsible key={tableName} defaultOpen={result.data.length <= 3}>
          <CollapsibleTrigger asChild>
            <button className="group flex items-center gap-2 px-3 py-2 rounded-full border border-border/60 bg-muted/50 hover:bg-muted hover:border-primary/30 transition-all text-[11px] font-['Manrope'] font-bold text-muted-foreground hover:text-foreground w-auto">
              <Database className="h-3.5 w-3.5 text-primary" />
              {tableName}
              <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">{result.record_count}</span>
              <ChevronDown className="h-3 w-3 ml-1 transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 bg-card border border-border/60 rounded-xl p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {result.data.length > 0 && Object.keys(result.data[0]).filter((k) => !k.includes('_vector')).slice(0, 6).map((k) => (
                      <TableHead key={k} className="text-xs font-semibold h-8">{k.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.data.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      {Object.entries(row).filter(([k]) => !k.includes('_vector')).slice(0, 6).map(([k, v]) => (
                        <TableCell key={k} className="text-xs py-2">
                          {k === 'relevance_score' && typeof v === 'number' ? v.toFixed(2)
                            : k.includes('created_at') || k.includes('updated_at') ? new Date(v as string).toLocaleDateString()
                            : String(v).length > 50 ? String(v).substring(0, 50) + '…'
                            : String(v)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {result.data.length > 10 && (
                <p className="text-xs text-muted-foreground/50 text-center mt-2 pt-2 border-t border-border/40">Showing 10 of {result.data.length} records</p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}

      {hasChat && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button className="group flex items-center gap-2 px-3 py-2 rounded-full border border-border/60 bg-muted/50 hover:bg-muted hover:border-primary/30 transition-all text-[11px] font-['Manrope'] font-bold text-muted-foreground hover:text-foreground w-auto">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              {sources.chat_results!.length} chat context{sources.chat_results!.length !== 1 ? 's' : ''}
              <ChevronDown className="h-3 w-3 ml-1 transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 bg-card border border-border/60 rounded-xl p-4 space-y-3">
              {sources.chat_results!.map((chat, idx) => (
                <div key={idx} className="flex flex-col gap-1 pb-3 border-b border-border/40 last:border-0 last:pb-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{chat.source}</span>
                    {chat.platform && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{chat.platform}</span>}
                    {chat.relevance_score && <span className="text-[10px] text-muted-foreground/50">{(chat.relevance_score * 100).toFixed(0)}% match</span>}
                  </div>
                  {chat.participants && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> {chat.participants}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground line-clamp-3 italic">{chat.content_preview}</p>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
      </div>
    </div>
  );
}
