"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { PdfViewerDialog } from "@/components/pdf-viewer-dialog";
import { HybridQueryApi, AvailableModelsApi } from "@/services";
import { useToast } from "@/hooks/use-toast";
import type {
  HybridResponse,
  HybridQueryRequest,
  AvailableModelsResponse,
  LLMProvider,
  PdfSourceInfo,
} from "@/services";
import {
  Loader2,
  ExternalLink,
  Eye,
  ChevronDown,
  FileText,
  Database,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

// Types
interface PdfViewerState {
  open: boolean;
  pdfUrl: string;
  fileName: string;
  page?: number;
  searchText?: string;
  contentPreview?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  modelUsed?: string;
  sources?: {
    pdf_sources?: string[];
    pdf_sources_detailed?: PdfSourceInfo[];
    db_results?: Record<
      string,
      {
        table: string;
        data: any[];
        record_count: number;
        avg_relevance_score?: number | null;
      }
    >;
    chat_results?: any[];
    processing_time?: number;
    search_terms?: string[];
    target_tables?: string[];
  };
}

type ResearchMode = "General" | "Project Context" | "Policy" | "Deep Research";

interface ChatInterfaceProps {
  selectedPdfCollections?: string[];
  selectedChatCollections?: string[];
  pendingQuestion?: string;
  onPendingQuestionConsumed?: () => void;
}

export function ChatInterface({
  selectedPdfCollections = [],
  selectedChatCollections = [],
  pendingQuestion,
  onPendingQuestionConsumed,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [researchMode, setResearchMode] = useState<ResearchMode>("General");
  const [includePdf, setIncludePdf] = useState(true);
  const [includeDb, setIncludeDb] = useState(false);
  const [includeChat, setIncludeChat] = useState(false);
  const [selectedProvider, setSelectedProvider] =
    useState<LLMProvider>("huggingface");
  const [selectedModel, setSelectedModel] = useState<string>(
    "google/flan-t5-base",
  );
  const [availableModels, setAvailableModels] =
    useState<AvailableModelsResponse | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const [pdfViewer, setPdfViewer] = useState<PdfViewerState>({
    open: false,
    pdfUrl: "",
    fileName: "",
  });

  useEffect(() => {
    AvailableModelsApi.get<AvailableModelsResponse>()
      .then((data) => {
        setAvailableModels(data);
        setSelectedProvider(data.default_provider);
        setSelectedModel(data.default_model);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const openPdfViewer = (source: PdfSourceInfo) => {
    if (!source.file_url) {
      toast({
        title: "PDF URL Tidak Valid",
        description: `File ${source.file_name} tidak memiliki URL yang valid.`,
        variant: "destructive",
      });
      return;
    }
    fetch(source.file_url, { method: "HEAD" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setPdfViewer({
          open: true,
          pdfUrl: source.file_url ?? "",
          fileName: source.file_name,
          page: source.page,
          searchText: source.search_text,
          contentPreview: source.content_preview,
        });
      })
      .catch((err) =>
        toast({
          title: "PDF Tidak Dapat Diakses",
          description: err.message,
          variant: "destructive",
        }),
      );
  };

  const buildRequest = (question: string): HybridQueryRequest => ({
    question,
    include_pdf_results: includePdf,
    include_db_results: includeDb,
    include_chat_results: includeChat,
    llm_provider: selectedProvider,
    llm_model: selectedModel,
    pdf_collection_ids:
      selectedPdfCollections.length > 0 ? selectedPdfCollections : undefined,
    chat_collection_ids:
      selectedChatCollections.length > 0 ? selectedChatCollections : undefined,
  });

  const appendAssistantMessage = (data: HybridResponse) => {
    setMessages((prev) => [
      ...prev,
      {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
        modelUsed: data.model_used,
        sources: {
          pdf_sources: data.pdf_sources,
          pdf_sources_detailed: data.pdf_sources_detailed,
          db_results: data.db_results as any,
          chat_results: data.chat_results,
          processing_time: data.processing_time,
          search_terms: data.search_terms,
          target_tables: data.target_tables,
        },
      },
    ]);
  };

  const runQuery = (question: string) => {
    setLoading(true);
    HybridQueryApi.store<HybridResponse>(
      buildRequest(question) as unknown as Record<string, unknown>,
    )
      .then((data: HybridResponse) => appendAssistantMessage(data))
      .catch(() =>
        toast({
          title: "Error",
          description: "Query failed. Please try again.",
          variant: "destructive",
        }),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!pendingQuestion?.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "user",
        content: pendingQuestion.trim(),
      },
    ]);
    onPendingQuestionConsumed?.();
    runQuery(pendingQuestion.trim());
  }, [pendingQuestion]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    const question = input.trim();
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: question },
    ]);
    setInput("");
    runQuery(question);
  };

  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const hasConversation = messages.length > 0;
  const researchModes: ResearchMode[] = [
    "General",
    "Project Context",
    "Policy",
    "Deep Research",
  ];

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Center scroll area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-4xl mx-auto px-8 py-10 w-full flex flex-col space-y-8 pb-48">
            {!hasConversation ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-16 w-16 rounded-2xl bg-[#dbe1ff] flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-[#0053db] text-3xl">
                    search
                  </span>
                </div>
                <h2 className="font-[Manrope] text-2xl font-bold text-[#2a3439] mb-2">
                  Ask anything about your documents
                </h2>
                <p className="text-[#566166] font-[Inter] max-w-md">
                  Search across PDFs, databases, and chat logs using natural
                  language
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <section key={message.id} className="space-y-6">
                  {message.role === "user" && (
                    <div className="flex items-start space-x-4">
                      <Avatar className="mt-1 w-8 h-8 shrink-0">
                        <AvatarFallback className="bg-[#c7d5ed] text-[#324053]">
                          <span className="material-symbols-outlined text-sm">
                            person
                          </span>
                        </AvatarFallback>
                      </Avatar>
                      <h1 className="font-[Manrope] text-2xl font-bold text-[#2a3439] leading-tight">
                        {message.content}
                      </h1>
                    </div>
                  )}
                  {message.role === "assistant" && (
                    <div className="space-y-4">
                      <div className="bg-white rounded-2xl p-8 shadow-[0_12px_32px_-4px_rgba(42,52,57,0.06)] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-60 transition-opacity">
                          <span className="material-symbols-outlined text-[#0053db] text-4xl">
                            auto_awesome
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-[#0053db] mb-4">
                          <span
                            className="material-symbols-outlined text-lg"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            verified
                          </span>
                          <span className="text-[10px] font-bold tracking-widest uppercase font-[Manrope]">
                            Synthesized Intelligence
                          </span>
                        </div>
                        <div className="font-[Inter] text-lg text-[#2a3439] leading-relaxed prose prose-neutral max-w-none prose-headings:font-[Manrope] prose-headings:text-[#2a3439] prose-strong:text-[#2a3439] prose-li:my-0.5">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                        {(message.modelUsed ||
                          message.sources?.processing_time) && (
                          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-[#d9e4ea]/60">
                            {message.modelUsed && (
                              <span className="text-[10px] font-bold font-[Manrope] uppercase tracking-widest text-[#566166]">
                                🤖 {message.modelUsed}
                              </span>
                            )}
                            {message.sources?.processing_time && (
                              <span className="text-[10px] text-[#a9b4b9]">
                                {message.sources.processing_time.toFixed(2)}s
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {message.sources && (
                        <SourcesSection
                          message={message}
                          onOpenPdfViewer={openPdfViewer}
                        />
                      )}
                    </div>
                  )}
                </section>
              ))
            )}

            {loading && (
              <div className="flex items-start space-x-4">
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className="bg-[#dbe1ff]">
                    <span className="material-symbols-outlined text-[#0053db] text-sm">
                      hub
                    </span>
                  </AvatarFallback>
                </Avatar>
                <div className="bg-white rounded-2xl px-6 py-4 shadow-[0_12px_32px_-4px_rgba(42,52,57,0.06)]">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#0053db]" />
                    <span className="text-sm font-[Inter] text-[#566166]">
                      Synthesizing intelligence…
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </div>

        {/* Floating bottom chat bar */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#f7f9fb] via-[#f7f9fb]/95 to-transparent pointer-events-none z-30">
          <div className="max-w-4xl mx-auto pointer-events-auto">
            <div className="bg-white rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
              <div className="flex items-center gap-2 px-2 pb-2 mb-1 border-b border-[#f0f4f7]">
                <ToggleGroup
                  type="single"
                  value={researchMode}
                  onValueChange={(v) => v && setResearchMode(v as ResearchMode)}
                  className="flex items-center gap-2"
                >
                  {researchModes.map((mode) => (
                    <ToggleGroupItem
                      key={mode}
                      value={mode}
                      className="px-3 py-1.5 rounded-full text-[10px] font-bold font-[Manrope] h-auto data-[state=on]:bg-[#dbe1ff] data-[state=on]:text-[#0048bf] data-[state=on]:ring-1 data-[state=on]:ring-[#0053db]/20 bg-[#e1e9ee] text-[#455367] hover:bg-[#d9e4ea]"
                    >
                      {mode}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <div className="ml-auto flex items-center gap-2">
                  {(
                    [
                      [
                        "PDF",
                        "description",
                        includePdf,
                        () => setIncludePdf(!includePdf),
                      ],
                      [
                        "DB",
                        "database",
                        includeDb,
                        () => setIncludeDb(!includeDb),
                      ],
                      [
                        "Chat",
                        "chat",
                        includeChat,
                        () => setIncludeChat(!includeChat),
                      ],
                    ] as [string, string, boolean, () => void][]
                  ).map(([label, icon, active, toggle]) => (
                    <Toggle
                      key={label}
                      pressed={active}
                      onPressedChange={toggle}
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold font-[Manrope] h-auto data-[state=on]:bg-[#0053db] data-[state=on]:text-white bg-[#f0f4f7] text-[#566166] hover:bg-[#e1e9ee]"
                    >
                      <span className="material-symbols-outlined text-xs leading-none">
                        {icon}
                      </span>
                      {label}
                    </Toggle>
                  ))}

                  {/* Model selector */}
                  {availableModels && (
                    <div className="flex items-center gap-1 pl-2 border-l border-[#e1e9ee]">
                      <span className="material-symbols-outlined text-xs text-[#566166]">
                        smart_toy
                      </span>
                      <select
                        value={`${selectedProvider}::${selectedModel}`}
                        onChange={(e) => {
                          const [provider, model] = e.target.value.split("::");
                          setSelectedProvider(provider as LLMProvider);
                          setSelectedModel(model);
                        }}
                        className="text-[10px] font-bold font-[Manrope] text-[#455367] bg-transparent border-none outline-none cursor-pointer pr-1 max-w-[140px]"
                      >
                        {Object.entries(availableModels.available_models).map(
                          ([provider, models]) => (
                            <optgroup key={provider} label={provider}>
                              {(models as string[]).map((model) => (
                                <option
                                  key={`${provider}::${model}`}
                                  value={`${provider}::${model}`}
                                >
                                  {model
                                    .replace("google/", "")
                                    .replace("gemini-", "gemini ")}
                                </option>
                              ))}
                            </optgroup>
                          ),
                        )}
                      </select>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 px-2">
                <span className="material-symbols-outlined text-[#566166]">
                  attach_file
                </span>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="Ask a follow-up inquiry…"
                  className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 text-sm font-[Inter] text-[#2a3439] placeholder:text-[#a9b4b9] py-3 h-auto"
                />
                <Button
                  onClick={() => handleSubmit()}
                  disabled={!input.trim() || loading}
                  size="icon"
                  className="bg-[#0053db] w-10 h-10 rounded-xl text-white shadow-lg shadow-[#0053db]/20 hover:scale-105 active:scale-95 hover:bg-[#0048c1] disabled:opacity-40"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-lg">
                      send
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel: Traceability & Context — hidden for now */}
      <aside className="w-80 shrink-0 h-full bg-[#f0f4f7] flex flex-col overflow-y-auto custom-scrollbar p-6 hidden">
        <h2 className="font-[Manrope] text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#566166] mb-8">
          Traceability &amp; Context
        </h2>

        {lastAssistant ? (
          <>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <Card className="p-4 text-center gap-1 shadow-[0_12px_32px_-4px_rgba(42,52,57,0.04)] border-none">
                <p className="text-[10px] font-bold font-[Manrope] uppercase text-[#566166] mb-1">
                  Confidence
                </p>
                <p className="text-2xl font-bold text-[#0053db]">
                  {lastAssistant.sources?.processing_time
                    ? `${Math.min(99, Math.round(90 + 1 / (lastAssistant.sources.processing_time + 0.1)))}%`
                    : "—"}
                </p>
              </Card>
              <Card className="p-4 text-center gap-1 shadow-[0_12px_32px_-4px_rgba(42,52,57,0.04)] border-none">
                <p className="text-[10px] font-bold font-[Manrope] uppercase text-[#566166] mb-1">
                  Freshness
                </p>
                <p className="text-sm font-bold text-[#2a3439]">
                  Updated Today
                </p>
              </Card>
            </div>

            {lastAssistant.sources?.pdf_sources_detailed &&
              lastAssistant.sources.pdf_sources_detailed.length > 0 && (
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold font-[Manrope] text-[#2a3439]">
                      Sources Used
                    </h3>
                    <span className="text-[10px] bg-[#d5e3fc] px-2 py-0.5 rounded-full text-[#455367] font-bold">
                      {lastAssistant.sources.pdf_sources_detailed.length} Docs
                    </span>
                  </div>
                  <div className="space-y-2">
                    {lastAssistant.sources.pdf_sources_detailed
                      .slice(0, 5)
                      .map((src, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl",
                            i === 0
                              ? "bg-[#dbe1ff]/50 border border-[#0053db]/10"
                              : "bg-white",
                          )}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span
                              className="material-symbols-outlined text-[#0053db] text-sm"
                              style={
                                i === 0
                                  ? { fontVariationSettings: "'FILL' 1" }
                                  : {}
                              }
                            >
                              check_circle
                            </span>
                            <span className="text-xs font-medium text-[#2a3439] truncate">
                              {src.file_name}
                            </span>
                          </div>
                          {src.page_url && (
                            <a
                              href={src.page_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <span className="material-symbols-outlined text-[#0053db] text-xs">
                                open_in_new
                              </span>
                            </a>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {lastAssistant.sources?.db_results &&
              Object.keys(lastAssistant.sources.db_results).length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xs font-bold font-[Manrope] text-[#2a3439] mb-4">
                    Database Results
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(lastAssistant.sources.db_results).map(
                      ([table, result]) => (
                        <div
                          key={table}
                          className="flex items-center justify-between p-3 bg-white rounded-xl"
                        >
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#0053db] text-sm">
                              table_chart
                            </span>
                            <span className="text-xs font-medium text-[#2a3439] truncate">
                              {table}
                            </span>
                          </div>
                          <span className="text-[10px] bg-[#d5e3fc] px-2 py-0.5 rounded-full text-[#455367] font-bold shrink-0">
                            {result.record_count} rows
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

            {lastAssistant.sources?.search_terms &&
              lastAssistant.sources.search_terms.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xs font-bold font-[Manrope] text-[#2a3439] mb-3">
                    Search Terms
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {lastAssistant.sources.search_terms.map((term, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-[#e8eff3] text-[#455367] px-2 py-1 rounded-full font-[Inter]"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            <div className="mt-auto pt-4">
              <div className="p-4 bg-[#d9e4ea] rounded-2xl">
                <h4 className="text-xs font-bold font-[Manrope] text-[#2a3439] mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">
                    search_off
                  </span>
                  Missing Context
                </h4>
                <ul className="text-[11px] space-y-1.5 text-[#566166] font-[Inter]">
                  <li>• Add more PDFs to Sources for broader coverage</li>
                  <li>• Enable Database search for structured data</li>
                </ul>
                <Button
                  variant="outline"
                  className="w-full mt-4 py-2 border-[#0053db]/20 text-xs font-bold text-[#0053db] hover:bg-[#0053db]/5 hover:text-[#0053db] font-[Manrope] h-auto"
                >
                  Trigger Research Task
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <span className="material-symbols-outlined text-4xl text-[#a9b4b9] mb-3">
              analytics
            </span>
            <p className="text-xs font-[Inter] text-[#a9b4b9]">
              Ask a question to see traceability data here
            </p>
          </div>
        )}
      </aside>

      <PdfViewerDialog
        open={pdfViewer.open}
        onOpenChange={(open) => setPdfViewer((prev) => ({ ...prev, open }))}
        pdfUrl={pdfViewer.pdfUrl}
        fileName={pdfViewer.fileName}
        initialPage={pdfViewer.page}
        searchText={pdfViewer.searchText}
        contentPreview={pdfViewer.contentPreview}
      />
    </div>
  );
}

// Sources Section Component
function SourcesSection({
  message,
  onOpenPdfViewer,
}: {
  message: Message;
  onOpenPdfViewer: (s: PdfSourceInfo) => void;
}) {
  const { sources } = message;
  if (!sources) return null;
  const hasPdfDetailed = (sources.pdf_sources_detailed?.length ?? 0) > 0;
  const hasPdfSimple =
    !hasPdfDetailed && (sources.pdf_sources?.length ?? 0) > 0;
  const hasDb = Object.keys(sources.db_results ?? {}).length > 0;
  const hasChat = (sources.chat_results?.length ?? 0) > 0;
  if (!hasPdfDetailed && !hasPdfSimple && !hasDb && !hasChat) return null;

  return (
    <div className="space-y-3">
      {hasPdfDetailed && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-3 bg-[#f0f4f7] rounded-xl cursor-pointer hover:bg-[#e8eff3] transition-colors">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#0053db]" />
                <span className="text-xs font-semibold font-[Manrope] text-[#2a3439]">
                  PDF Sources ({sources.pdf_sources_detailed!.length})
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-[#566166]" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 bg-white rounded-xl p-4 space-y-4">
              {sources.pdf_sources_detailed!.map((src, idx) => (
                <div
                  key={idx}
                  className="text-xs space-y-2 pb-3 border-b border-[#f0f4f7] last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-[#566166]" />
                    {src.page_url ? (
                      <a
                        href={src.page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-[#0053db] hover:underline flex items-center gap-1"
                      >
                        {src.file_name} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="font-medium text-[#2a3439]">
                        {src.file_name}
                      </span>
                    )}
                  </div>
                  {src.content_preview && (
                    <p className="text-[#566166] line-clamp-2 pl-5">
                      {src.content_preview}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pl-5 flex-wrap">
                    {src.page && (
                      <span className="text-[10px] bg-[#e8eff3] text-[#455367] px-2 py-0.5 rounded-full">
                        Page {src.page}
                      </span>
                    )}
                    {src.relevance_score && (
                      <span className="text-[10px] bg-[#e8eff3] text-[#455367] px-2 py-0.5 rounded-full">
                        Score: {src.relevance_score.toFixed(2)}
                      </span>
                    )}
                    {src.file_url && (
                      <button
                        onClick={() => onOpenPdfViewer(src)}
                        className="text-[10px] text-[#0053db] hover:bg-[#0053db]/10 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors"
                      >
                        <Eye className="h-3 w-3" /> View PDF
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
            <div className="flex items-center justify-between p-3 bg-[#f0f4f7] rounded-xl cursor-pointer hover:bg-[#e8eff3] transition-colors">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#0053db]" />
                <span className="text-xs font-semibold font-[Manrope] text-[#2a3439]">
                  PDF Sources ({sources.pdf_sources!.length})
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-[#566166]" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 bg-white rounded-xl p-4 space-y-2">
              {sources.pdf_sources!.map((src, idx) => (
                <p
                  key={idx}
                  className="text-xs text-[#2a3439] font-medium pb-2 border-b border-[#f0f4f7] last:border-0 last:pb-0"
                >
                  {src}
                </p>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {hasDb &&
        Object.entries(sources.db_results!).map(([tableName, result]) => (
          <Collapsible key={tableName} defaultOpen={result.data.length <= 3}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 bg-[#f0f4f7] rounded-xl cursor-pointer hover:bg-[#e8eff3] transition-colors">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-[#0053db]" />
                  <span className="text-xs font-semibold font-[Manrope] text-[#2a3439]">
                    {tableName}
                  </span>
                  <span className="text-[10px] bg-[#d5e3fc] text-[#455367] px-2 py-0.5 rounded-full font-bold">
                    {result.record_count} records
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-[#566166]" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 bg-white rounded-xl p-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {result.data.length > 0 &&
                        Object.keys(result.data[0])
                          .filter((k) => !k.includes("_vector"))
                          .slice(0, 6)
                          .map((k) => (
                            <TableHead
                              key={k}
                              className="text-xs font-semibold h-8"
                            >
                              {k
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </TableHead>
                          ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.data.slice(0, 10).map((row, i) => (
                      <TableRow key={i}>
                        {Object.entries(row)
                          .filter(([k]) => !k.includes("_vector"))
                          .slice(0, 6)
                          .map(([k, v]) => (
                            <TableCell key={k} className="text-xs py-2">
                              {k === "relevance_score" && typeof v === "number"
                                ? v.toFixed(2)
                                : k.includes("created_at") ||
                                    k.includes("updated_at")
                                  ? new Date(v as string).toLocaleDateString()
                                  : String(v).length > 50
                                    ? String(v).substring(0, 50) + "…"
                                    : String(v)}
                            </TableCell>
                          ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {result.data.length > 10 && (
                  <p className="text-xs text-[#a9b4b9] text-center mt-2 pt-2 border-t border-[#f0f4f7]">
                    Showing 10 of {result.data.length} records
                  </p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}

      {hasChat && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-3 bg-[#f0f4f7] rounded-xl cursor-pointer hover:bg-[#e8eff3] transition-colors">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#0053db]" />
                <span className="text-xs font-semibold font-[Manrope] text-[#2a3439]">
                  Chat Context ({sources.chat_results!.length})
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-[#566166]" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 bg-white rounded-xl p-4 space-y-3">
              {sources.chat_results!.map((chat, idx) => (
                <div
                  key={idx}
                  className="text-xs space-y-1 pb-3 border-b border-[#f0f4f7] last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] bg-[#e8eff3] text-[#455367] px-2 py-0.5 rounded-full">
                      {chat.source}
                    </span>
                    {chat.platform && (
                      <span className="text-[10px] bg-[#d5e3fc] text-[#455367] px-2 py-0.5 rounded-full">
                        {chat.platform}
                      </span>
                    )}
                    {chat.relevance_score && (
                      <span className="text-[10px] text-[#a9b4b9]">
                        Score: {chat.relevance_score.toFixed(3)}
                      </span>
                    )}
                  </div>
                  {chat.participants && (
                    <p className="text-[10px] text-[#566166]">
                      👥 {chat.participants}
                    </p>
                  )}
                  <p className="text-[#566166] line-clamp-3">
                    {chat.content_preview}
                  </p>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
