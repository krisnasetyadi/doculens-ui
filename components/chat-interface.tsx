"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Loader2,
  FileText,
  Database,
  MessageSquare,
  Clock,
  Search,
  ChevronDown,
  ExternalLink,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// State for PDF viewer dialog
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

interface ChatInterfaceProps {
  apiUrl: string;
}

export function ChatInterface({ apiUrl }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [includePdf, setIncludePdf] = useState(true);
  const [includeDb, setIncludeDb] = useState(true);
  const [includeChat, setIncludeChat] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // PDF Viewer Dialog state
  const [pdfViewer, setPdfViewer] = useState<PdfViewerState>({
    open: false,
    pdfUrl: "",
    fileName: "",
  });

  // Function to open PDF in viewer
  const openPdfViewer = (source: PdfSourceInfo) => {
    if (source.file_url) {
      // Test if PDF URL is accessible before opening viewer
      fetch(source.file_url, { method: "HEAD" })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          setPdfViewer({
            open: true,
            pdfUrl: source.file_url,
            fileName: source.file_name,
            page: source.page,
            searchText: source.search_text,
            contentPreview: source.content_preview,
          });
        })
        .catch((error) => {
          console.error("PDF access error:", error);
          toast({
            title: "PDF Tidak Dapat Diakses",
            description: `File ${source.file_name} tidak ditemukan atau tidak dapat diakses. Error: ${error.message}`,
            variant: "destructive",
          });
        });
    } else {
      toast({
        title: "PDF URL Tidak Valid",
        description: `File ${source.file_name} tidak memiliki URL yang valid.`,
        variant: "destructive",
      });
    }
  };

  // Model selection state
  const [availableModels, setAvailableModels] =
    useState<AvailableModelsResponse | null>(null);
  const [selectedProvider, setSelectedProvider] =
    useState<LLMProvider>("huggingface");
  const [selectedModel, setSelectedModel] = useState<string>(
    "google/flan-t5-base"
  );
  const [loadingModels, setLoadingModels] = useState(false);

  // Fetch available models on mount
  useEffect(() => {
    setLoadingModels(true);
    AvailableModelsApi.get<AvailableModelsResponse>()
      .then((data) => {
        setAvailableModels(data);
        setSelectedProvider(data.default_provider);
        setSelectedModel(data.default_model);
      })
      .catch((error) => {
        console.error("Failed to fetch available models:", error);
        toast({
          title: "Model Loading Error",
          description:
            "Failed to load available AI models. Using default model.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setLoadingModels(false);
      });
  }, []);

  // Update selected model when provider changes
  const handleProviderChange = (provider: LLMProvider) => {
    setSelectedProvider(provider);
    if (availableModels) {
      const models = availableModels.available_models[provider];
      if (models && models.length > 0) {
        setSelectedModel(models[0]);
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const request: HybridQueryRequest = {
      question: userMessage.content,
      include_pdf_results: includePdf,
      include_db_results: includeDb,
      include_chat_results: includeChat,
      llm_provider: selectedProvider,
      llm_model: selectedModel,
    };

    HybridQueryApi.store<HybridResponse>(request as Record<string, unknown>)
      .then((data) => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.answer,
          modelUsed: data.model_used,
          sources: {
            pdf_sources: data.pdf_sources,
            pdf_sources_detailed: data.pdf_sources_detailed,
            db_results: data.db_results,
            chat_results: data.chat_results,
            processing_time: data.processing_time,
            search_terms: data.search_terms,
            target_tables: data.target_tables,
          },
        };
        setMessages((prev) => [...prev, assistantMessage]);
      })
      .catch((error) => {
        console.error("Search failed:", error);

        // Show detailed error toast
        let errorDetail = "Terjadi kesalahan saat memproses pertanyaan Anda.";
        if (error.status === 404) {
          errorDetail =
            "API endpoint tidak ditemukan. Pastikan server backend berjalan.";
        } else if (error.status === 500) {
          errorDetail =
            "Server error. Periksa log server untuk detail lebih lanjut.";
        } else if (error.message) {
          errorDetail = error.message;
        }

        toast({
          title: "Query Error",
          description: errorDetail,
          variant: "destructive",
        });

        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "Maaf, terjadi kesalahan saat memproses pertanyaan Anda. Silakan periksa koneksi API dan coba lagi.",
        };
        setMessages((prev) => [...prev, errorMessage]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 h-0">
        <ScrollArea className="h-full">
          <div className="max-w-3xl mx-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-teal-500" />
                </div>
                <h2 className="text-2xl font-semibold mb-2 text-balance">
                  Tanyakan apapun tentang dokumen Anda
                </h2>
                <p className="text-muted-foreground max-w-md text-balance">
                  Cari informasi di PDF, database, dan chat logs menggunakan
                  bahasa natural
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shrink-0">
                      <span className="text-white font-bold text-xs">AI</span>
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] space-y-1.5",
                      message.role === "user" && "items-end"
                    )}
                  >
                    <Card
                      className={cn(
                        "p-4",
                        message.role === "user"
                          ? "bg-teal-500 text-white border-teal-500"
                          : "bg-card"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                    </Card>

                    {message.sources && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Model Used Badge */}
                          {message.modelUsed && (
                            <Badge
                              variant="outline"
                              className="text-xs py-0 h-5 border-teal-500/50 text-teal-600 dark:text-teal-400"
                            >
                              🤖 {message.modelUsed}
                            </Badge>
                          )}

                          {message.sources.processing_time && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                {message.sources.processing_time.toFixed(2)}s
                              </span>
                            </div>
                          )}

                          {message.sources.search_terms &&
                            message.sources.search_terms.length > 0 && (
                              <>
                                {message.sources.search_terms
                                  .slice(0, 5)
                                  .map((term, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="secondary"
                                      className="text-xs py-0 h-5"
                                    >
                                      {term}
                                    </Badge>
                                  ))}
                                {message.sources.search_terms.length > 5 && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs py-0 h-5"
                                  >
                                    +{message.sources.search_terms.length - 5}{" "}
                                    more
                                  </Badge>
                                )}
                              </>
                            )}
                        </div>

                        {/* PDF Sources with Links */}
                        {message.sources.pdf_sources_detailed &&
                          message.sources.pdf_sources_detailed.length > 0 && (
                            <Collapsible>
                              <CollapsibleTrigger asChild>
                                <Card className="p-2.5 bg-accent/50 cursor-pointer hover:bg-accent/70 transition-colors">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-3.5 w-3.5 text-teal-500" />
                                      <span className="text-xs font-medium">
                                        PDF Sources (
                                        {
                                          message.sources.pdf_sources_detailed
                                            .length
                                        }
                                        )
                                      </span>
                                    </div>
                                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                  </div>
                                </Card>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <Card className="p-3 mt-1 bg-accent/30">
                                  <div className="space-y-3">
                                    {message.sources.pdf_sources_detailed.map(
                                      (source, idx) => (
                                        <div
                                          key={idx}
                                          className="text-xs space-y-2 pb-3 border-b border-border/50 last:border-0 last:pb-0"
                                        >
                                          {/* File name with link */}
                                          <div className="flex items-center gap-2">
                                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                            {source.page_url ? (
                                              <a
                                                href={source.page_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-medium text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                                              >
                                                {source.file_name}
                                                <ExternalLink className="h-3 w-3" />
                                              </a>
                                            ) : (
                                              <span className="font-medium">
                                                {source.file_name}
                                              </span>
                                            )}
                                          </div>

                                          {/* Content preview */}
                                          {source.content_preview && (
                                            <p className="text-muted-foreground line-clamp-2 pl-5">
                                              {source.content_preview}
                                            </p>
                                          )}

                                          {/* Badges and Actions */}
                                          <div className="flex items-center gap-2 pl-5 flex-wrap">
                                            {source.page && (
                                              <Badge
                                                variant="outline"
                                                className="text-[10px] h-4"
                                              >
                                                Halaman {source.page}
                                              </Badge>
                                            )}
                                            {source.relevance_score && (
                                              <Badge
                                                variant="outline"
                                                className="text-[10px] h-4"
                                              >
                                                Score:{" "}
                                                {source.relevance_score.toFixed(
                                                  2
                                                )}
                                              </Badge>
                                            )}
                                            {/* View in dialog button */}
                                            {source.file_url && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-5 px-2 text-[10px] text-teal-600 dark:text-teal-400 hover:bg-teal-500/10"
                                                onClick={() =>
                                                  openPdfViewer(source)
                                                }
                                              >
                                                <Eye className="h-3 w-3 mr-1" />
                                                Lihat PDF
                                              </Button>
                                            )}
                                            {/* Open in new tab */}
                                            {source.page_url && (
                                              <a
                                                href={source.page_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[10px] text-muted-foreground hover:text-foreground hover:underline flex items-center gap-0.5"
                                              >
                                                Tab Baru
                                                <ExternalLink className="h-2.5 w-2.5" />
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </Card>
                              </CollapsibleContent>
                            </Collapsible>
                          )}

                        {/* Fallback: Simple PDF sources (backward compatible) */}
                        {(!message.sources.pdf_sources_detailed ||
                          message.sources.pdf_sources_detailed.length === 0) &&
                          message.sources.pdf_sources &&
                          message.sources.pdf_sources.length > 0 && (
                            <Collapsible>
                              <CollapsibleTrigger asChild>
                                <Card className="p-2.5 bg-accent/50 cursor-pointer hover:bg-accent/70 transition-colors">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-3.5 w-3.5 text-teal-500" />
                                      <span className="text-xs font-medium">
                                        PDF Sources (
                                        {message.sources.pdf_sources.length})
                                      </span>
                                    </div>
                                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                  </div>
                                </Card>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <Card className="p-3 mt-1 bg-accent/30">
                                  <div className="space-y-2">
                                    {message.sources.pdf_sources.map(
                                      (source, idx) => (
                                        <div
                                          key={idx}
                                          className="text-xs pb-2 border-b border-border/50 last:border-0 last:pb-0"
                                        >
                                          <p className="font-medium">
                                            {source}
                                          </p>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </Card>
                              </CollapsibleContent>
                            </Collapsible>
                          )}

                        {message.sources.db_results &&
                          Object.keys(message.sources.db_results).length >
                            0 && (
                            <div className="space-y-1.5">
                              {Object.entries(message.sources.db_results).map(
                                ([tableName, result]) => (
                                  <Collapsible
                                    key={tableName}
                                    defaultOpen={result.data.length <= 3}
                                  >
                                    <CollapsibleTrigger asChild>
                                      <Card className="p-2.5 bg-accent/50 cursor-pointer hover:bg-accent/70 transition-colors">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <Database className="h-3.5 w-3.5 text-cyan-500" />
                                            <span className="text-xs font-medium">
                                              {tableName}
                                            </span>
                                            <Badge
                                              variant="outline"
                                              className="text-[10px] h-4"
                                            >
                                              {result.record_count}{" "}
                                              {result.record_count === 1
                                                ? "record"
                                                : "records"}
                                            </Badge>
                                            {result.avg_relevance_score && (
                                              <Badge
                                                variant="outline"
                                                className="text-[10px] h-4"
                                              >
                                                Avg:{" "}
                                                {result.avg_relevance_score.toFixed(
                                                  2
                                                )}
                                              </Badge>
                                            )}
                                          </div>
                                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                        </div>
                                      </Card>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <Card className="p-3 mt-1 bg-accent/30 overflow-hidden">
                                        <div className="overflow-x-auto">
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                {result.data.length > 0 &&
                                                  Object.keys(result.data[0])
                                                    .filter(
                                                      (key) =>
                                                        !key.includes(
                                                          "search_vector"
                                                        ) &&
                                                        !key.includes("_vector")
                                                    )
                                                    .slice(0, 6)
                                                    .map((key) => (
                                                      <TableHead
                                                        key={key}
                                                        className="text-xs font-semibold h-8"
                                                      >
                                                        {key
                                                          .replace(/_/g, " ")
                                                          .replace(
                                                            /\b\w/g,
                                                            (l) =>
                                                              l.toUpperCase()
                                                          )}
                                                      </TableHead>
                                                    ))}
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {result.data
                                                .slice(0, 10)
                                                .map((row, idx) => (
                                                  <TableRow key={idx}>
                                                    {Object.entries(row)
                                                      .filter(
                                                        ([key]) =>
                                                          !key.includes(
                                                            "search_vector"
                                                          ) &&
                                                          !key.includes(
                                                            "_vector"
                                                          )
                                                      )
                                                      .slice(0, 6)
                                                      .map(([key, value]) => (
                                                        <TableCell
                                                          key={key}
                                                          className="text-xs py-2"
                                                        >
                                                          {key ===
                                                            "relevance_score" &&
                                                          typeof value ===
                                                            "number"
                                                            ? value.toFixed(2)
                                                            : key.includes(
                                                                "created_at"
                                                              ) ||
                                                              key.includes(
                                                                "updated_at"
                                                              )
                                                            ? new Date(
                                                                value as string
                                                              ).toLocaleDateString()
                                                            : String(value)
                                                                .length > 50
                                                            ? String(
                                                                value
                                                              ).substring(
                                                                0,
                                                                50
                                                              ) + "..."
                                                            : String(value)}
                                                        </TableCell>
                                                      ))}
                                                  </TableRow>
                                                ))}
                                            </TableBody>
                                          </Table>
                                          {result.data.length > 10 && (
                                            <p className="text-xs text-muted-foreground text-center mt-2 py-1 border-t border-border/50">
                                              Showing 10 of {result.data.length}{" "}
                                              records
                                            </p>
                                          )}
                                        </div>
                                      </Card>
                                    </CollapsibleContent>
                                  </Collapsible>
                                )
                              )}
                            </div>
                          )}

                        {message.sources.chat_results &&
                          message.sources.chat_results.length > 0 && (
                            <Collapsible>
                              <CollapsibleTrigger asChild>
                                <Card className="p-2.5 bg-accent/50 cursor-pointer hover:bg-accent/70 transition-colors">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <MessageSquare className="h-3.5 w-3.5 text-purple-500" />
                                      <span className="text-xs font-medium">
                                        Chat Context (
                                        {message.sources.chat_results.length})
                                      </span>
                                    </div>
                                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                  </div>
                                </Card>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <Card className="p-3 mt-1 bg-accent/30">
                                  <div className="space-y-2">
                                    {message.sources.chat_results.map(
                                      (chat, idx) => (
                                        <div
                                          key={idx}
                                          className="text-xs space-y-1 pb-2 border-b border-border/50 last:border-0 last:pb-0"
                                        >
                                          <div className="flex items-center gap-2">
                                            <Badge
                                              variant={
                                                chat.role === "user"
                                                  ? "default"
                                                  : "secondary"
                                              }
                                              className="text-[10px] h-4"
                                            >
                                              {chat.role}
                                            </Badge>
                                            {chat.timestamp && (
                                              <span className="text-muted-foreground text-[10px]">
                                                {new Date(
                                                  chat.timestamp
                                                ).toLocaleString()}
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-muted-foreground line-clamp-3">
                                            {chat.content || chat.message}
                                          </p>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </Card>
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <span className="text-sm font-medium">U</span>
                    </div>
                  )}
                </div>
              ))
            )}
            {loading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-xs">AI</span>
                </div>
                <Card className="p-4 bg-card">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </Card>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm shrink-0">
        <div className="max-w-3xl mx-auto p-4">
          {/* Model Selector */}
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border/50">
            <span className="text-xs text-muted-foreground font-medium">
              Model:
            </span>
            {loadingModels ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Select
                  value={selectedProvider}
                  onValueChange={(value) =>
                    handleProviderChange(value as LLMProvider)
                  }
                >
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue placeholder="Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels &&
                      Object.keys(availableModels.available_models).map(
                        (provider) => (
                          <SelectItem
                            key={provider}
                            value={provider}
                            className="text-xs"
                          >
                            {provider === "huggingface" && "🤗 HuggingFace"}
                            {provider === "gemini" && "✨ Gemini"}
                          </SelectItem>
                        )
                      )}
                  </SelectContent>
                </Select>

                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue placeholder="Model" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels &&
                      availableModels.available_models[selectedProvider]?.map(
                        (model) => (
                          <SelectItem
                            key={model}
                            value={model}
                            className="text-xs"
                          >
                            {model}
                          </SelectItem>
                        )
                      )}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          {/* Search Options */}
          <div className="flex items-center gap-4 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch
                id="pdf-search"
                checked={includePdf}
                onCheckedChange={setIncludePdf}
              />
              <Label htmlFor="pdf-search" className="text-xs cursor-pointer">
                <FileText className="h-3 w-3 inline mr-1" />
                PDFs
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="db-search"
                checked={includeDb}
                onCheckedChange={setIncludeDb}
              />
              <Label htmlFor="db-search" className="text-xs cursor-pointer">
                <Database className="h-3 w-3 inline mr-1" />
                Database
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="chat-search"
                checked={includeChat}
                onCheckedChange={setIncludeChat}
              />
              <Label htmlFor="chat-search" className="text-xs cursor-pointer">
                <MessageSquare className="h-3 w-3 inline mr-1" />
                Chats
              </Label>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="min-h-[60px] max-h-[200px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || loading}
              className="h-[60px] w-[60px] bg-teal-500 hover:bg-teal-600 text-white shrink-0"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* PDF Viewer Dialog */}
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
