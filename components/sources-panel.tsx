"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Upload,
  FileText,
  Database,
  MessageSquare,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Eye,
  File,
  CheckSquare,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PdfCollectionsApi,
  PdfUploadApi,
  PdfCollectionApi,
  ChatCollectionsApi,
  ChatUploadApi,
  ChatCollectionApi,
} from "@/services";
import type {
  PdfCollection,
  UploadResponse,
  ChatCollection,
  ChatUploadResponse,
  DeleteResponse,
} from "@/services";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface SourcesPanelProps {
  selectedPdfCollections?: string[];
  selectedChatCollections?: string[];
  onPdfCollectionsChange?: (ids: string[]) => void;
  onChatCollectionsChange?: (ids: string[]) => void;
}

const getCollectionTitle = (collection: PdfCollection): string => {
  if (collection.file_names && collection.file_names.length > 0) {
    const firstName = collection.file_names[0];
    return firstName
      .replace(/\.pdf$/i, "")
      .replace(/_/g, " ")
      .replace(/-/g, " ");
  }
  return "Untitled Collection";
};

type Tab = "pdf" | "chat" | "database";

export function SourcesPanel({
  selectedPdfCollections = [],
  selectedChatCollections = [],
  onPdfCollectionsChange,
  onChatCollectionsChange,
}: SourcesPanelProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("pdf");
  const [pdfCollections, setPdfCollections] = useState<PdfCollection[]>([]);
  const [chatCollections, setChatCollections] = useState<ChatCollection[]>([]);
  const [dbTables, setDbTables] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingDb, setLoadingDb] = useState(false);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const fetchPdf = () => {
    setLoadingPdf(true);
    PdfCollectionsApi.get<PdfCollection[]>()
      .then((data) => setPdfCollections(data))
      .catch(() =>
        toast({
          title: "Error",
          description: "Failed to fetch PDF collections",
          variant: "destructive",
        }),
      )
      .finally(() => setLoadingPdf(false));
  };

  const fetchChat = () => {
    setLoadingChat(true);
    ChatCollectionsApi.get<
      { collections: ChatCollection[]; count: number } | ChatCollection[]
    >()
      .then((data) => {
        if (Array.isArray(data)) setChatCollections(data);
        else if (data && Array.isArray((data as any).collections))
          setChatCollections((data as any).collections);
        else setChatCollections([]);
      })
      .catch(() => {
        setChatCollections([]);
        toast({
          title: "Error",
          description: "Failed to fetch chat collections",
          variant: "destructive",
        });
      })
      .finally(() => setLoadingChat(false));
  };

  const fetchDb = () => {
    setLoadingDb(true);
    fetch(`${API_BASE}/api/v1/database/tables`)
      .then((res) => res.json())
      .then(async (data) => {
        if (data.tables && data.tables.length > 0) {
          const withDetails = await Promise.all(
            data.tables.map(async (table: any) => {
              try {
                const r = await fetch(
                  `${API_BASE}/api/v1/database/table/${table.name}`,
                );
                const d = await r.json();
                return {
                  ...table,
                  columns: d.columns || [],
                  sample_data: d.sample_data || [],
                };
              } catch {
                return table;
              }
            }),
          );
          setDbTables(withDetails);
        } else setDbTables([]);
      })
      .catch(() => {})
      .finally(() => setLoadingDb(false));
  };

  useEffect(() => {
    if (activeTab === "pdf") fetchPdf();
    else if (activeTab === "chat") fetchChat();
    else if (activeTab === "database") fetchDb();
  }, [activeTab]);

  const handlePdfUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("files", f));
    PdfUploadApi.store<UploadResponse>(formData)
      .then((data) => {
        toast({
          title: "Upload Successful",
          description: `${data.file_count} PDF(s) uploaded`,
        });
        fetchPdf();
      })
      .catch(() =>
        toast({
          title: "Upload Failed",
          description: "Failed to upload PDF files",
          variant: "destructive",
        }),
      )
      .finally(() => setUploading(false));
  };

  const handleChatUpload = (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("platform", "whatsapp");
    ChatUploadApi.store<ChatUploadResponse>(formData)
      .then((data) => {
        toast({
          title: "Chat Upload Successful",
          description: `${data.message_count} messages processed`,
        });
        fetchChat();
      })
      .catch(() =>
        toast({
          title: "Upload Failed",
          description: "Failed to upload chat file",
          variant: "destructive",
        }),
      )
      .finally(() => setUploading(false));
  };

  const deletePdfCollection = (id: string) => {
    PdfCollectionApi.delete<DeleteResponse>(id)
      .then(() => {
        toast({ title: "Deleted" });
        fetchPdf();
      })
      .catch(() => toast({ title: "Delete Failed", variant: "destructive" }));
  };

  const deleteChatCollection = (id: string) => {
    ChatCollectionApi.delete<DeleteResponse>(id)
      .then(() => {
        toast({ title: "Deleted" });
        fetchChat();
      })
      .catch(() => toast({ title: "Delete Failed", variant: "destructive" }));
  };

  const toggleTable = (name: string) => {
    setExpandedTables((prev) => {
      const s = new Set(prev);
      s.has(name) ? s.delete(name) : s.add(name);
      return s;
    });
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "pdf",
      label: "PDF Documents",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      id: "chat",
      label: "Chat Corpora",
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      id: "database",
      label: "Database",
      icon: <Database className="h-4 w-4" />,
    },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 pt-10 pb-16">
        {/* Header */}
        <div className="mb-8">
          <h2 className="font-['Manrope'] text-3xl font-extrabold text-[#2a3439] tracking-tight mb-1">
            Sources
          </h2>
          <p className="font-['Inter'] text-[#566166]">
            Manage your knowledge sources — PDFs, chat corpora, and connected
            databases.
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as Tab)}
          className="w-full"
        >
          <TabsList className="bg-[#edf1f4] p-1 rounded-xl h-auto mb-8 w-fit">
            {tabs.map((t) => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="flex items-center gap-2 px-5 py-2 rounded-lg font-['Manrope'] font-semibold text-sm h-auto data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-[#0053db] text-[#566166]"
              >
                {t.icon}
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* PDF tab */}
          <TabsContent value="pdf">
            <div>
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-[#566166] font-['Inter']">
                  {selectedPdfCollections.length > 0
                    ? `${selectedPdfCollections.length} collection(s) selected for queries`
                    : "Click collections to select them for Ask queries"}
                </p>
                <Button
                  asChild
                  disabled={uploading}
                  className="bg-[#0053db] hover:bg-[#0048c1] font-['Manrope'] font-semibold gap-2"
                >
                  <label htmlFor="sp-pdf-upload" className="cursor-pointer">
                    <Upload className="h-4 w-4" />
                    {uploading ? "Uploading…" : "Upload PDF"}
                  </label>
                </Button>
                <input
                  id="sp-pdf-upload"
                  type="file"
                  multiple
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => handlePdfUpload(e.target.files)}
                />
              </div>

              {loadingPdf ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-7 w-7 animate-spin text-[#a9b4b9]" />
                </div>
              ) : pdfCollections.length === 0 ? (
                <div className="text-center py-16 text-[#a9b4b9]">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="font-['Inter'] text-sm">
                    No PDF collections yet. Upload some PDFs to get started.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pdfCollections.map((col) => {
                    const isSelected = selectedPdfCollections.includes(
                      col.collection_id,
                    );
                    return (
                      <Card
                        key={col.collection_id}
                        onClick={() =>
                          onPdfCollectionsChange?.(
                            isSelected
                              ? selectedPdfCollections.filter(
                                  (id) => id !== col.collection_id,
                                )
                              : [...selectedPdfCollections, col.collection_id],
                          )
                        }
                        className={cn(
                          "p-4 cursor-pointer transition-all hover:shadow-md group border-2",
                          isSelected
                            ? "border-[#0053db] bg-[#eef3ff]"
                            : "border-transparent bg-white",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-[#0053db] shrink-0" />
                            ) : (
                              <Square className="h-4 w-4 text-[#a9b4b9] shrink-0" />
                            )}
                            <FileText className="h-4 w-4 text-[#0053db] shrink-0" />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-[#a9b4b9] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePdfCollection(col.collection_id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <h3 className="text-sm font-semibold text-[#2a3439] truncate font-['Manrope'] mb-2">
                                {getCollectionTitle(col)}
                              </h3>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                {getCollectionTitle(col)}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {col.file_names &&
                          col.file_names.slice(0, 2).map((fn, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-1 text-[11px] text-[#566166] mb-0.5"
                            >
                              <File className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{fn}</span>
                            </div>
                          ))}
                        {col.file_names && col.file_names.length > 2 && (
                          <span className="text-[10px] text-[#a9b4b9]">
                            +{col.file_names.length - 2} more
                          </span>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <Badge variant="secondary" className="text-[10px]">
                            {col.document_count} docs
                          </Badge>
                          <span className="text-[10px] text-[#a9b4b9]">
                            {new Date(col.created_at).toLocaleDateString(
                              "en-GB",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Chat tab */}
          <TabsContent value="chat">
            <div>
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-[#566166] font-['Inter']">
                  {selectedChatCollections.length > 0
                    ? `${selectedChatCollections.length} collection(s) selected`
                    : "Select collections to include in Ask queries"}
                </p>
                <Button
                  asChild
                  disabled={uploading}
                  className="bg-[#0053db] hover:bg-[#0048c1] font-['Manrope'] font-semibold gap-2"
                >
                  <label htmlFor="sp-chat-upload" className="cursor-pointer">
                    <Upload className="h-4 w-4" />
                    {uploading ? "Uploading…" : "Upload Chat (.txt)"}
                  </label>
                </Button>
                <input
                  id="sp-chat-upload"
                  type="file"
                  accept=".txt"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && handleChatUpload(e.target.files[0])
                  }
                />
              </div>

              {loadingChat ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-7 w-7 animate-spin text-[#a9b4b9]" />
                </div>
              ) : chatCollections.length === 0 ? (
                <div className="text-center py-16 text-[#a9b4b9]">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="font-['Inter'] text-sm">
                    No chat corpora yet. Upload a WhatsApp export to get
                    started.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {chatCollections.map((col: any) => {
                    const isSelected = selectedChatCollections.includes(
                      col.collection_id,
                    );
                    return (
                      <Card
                        key={col.collection_id}
                        onClick={() =>
                          onChatCollectionsChange?.(
                            isSelected
                              ? selectedChatCollections.filter(
                                  (id) => id !== col.collection_id,
                                )
                              : [...selectedChatCollections, col.collection_id],
                          )
                        }
                        className={cn(
                          "p-4 cursor-pointer transition-all hover:shadow-md group border-2",
                          isSelected
                            ? "border-[#0053db] bg-[#eef3ff]"
                            : "border-transparent bg-white",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-[#0053db] shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-[#a9b4b9] shrink-0" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-[#a9b4b9] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteChatCollection(col.collection_id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <h3 className="text-sm font-semibold text-[#2a3439] truncate font-['Manrope'] mb-2">
                          {col.filename || col.file_name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {col.message_count} messages
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {col.platform}
                          </Badge>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Database tab */}
          <TabsContent value="database">
            <div>
              <p className="text-sm text-[#566166] font-['Inter'] mb-6">
                Connected database tables available for structured queries.
              </p>
              {loadingDb ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-7 w-7 animate-spin text-[#a9b4b9]" />
                </div>
              ) : dbTables.length === 0 ? (
                <div className="text-center py-16 text-[#a9b4b9]">
                  <Database className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="font-['Inter'] text-sm">
                    No database tables found.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dbTables.map((table: any) => (
                    <Card key={table.name} className="p-4 bg-white">
                      <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => toggleTable(table.name)}
                      >
                        {table.columns?.length > 0 ? (
                          expandedTables.has(table.name) ? (
                            <ChevronDown className="h-4 w-4 text-[#566166]" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-[#566166]" />
                          )
                        ) : (
                          <Database className="h-4 w-4 text-[#566166]" />
                        )}
                        <span className="font-['Manrope'] font-semibold text-[#2a3439] text-sm">
                          {table.name}
                        </span>
                        <div className="flex gap-2 ml-auto">
                          {table.row_count !== undefined && (
                            <Badge variant="secondary" className="text-xs">
                              {table.row_count} rows
                            </Badge>
                          )}
                          {table.columns && (
                            <Badge variant="outline" className="text-xs">
                              {table.columns.length} cols
                            </Badge>
                          )}
                        </div>
                      </div>
                      {expandedTables.has(table.name) &&
                        table.columns?.length > 0 && (
                          <div className="mt-3 pl-7 space-y-1.5 border-l-2 border-[#d9e4ea]">
                            {table.columns.map((col: any, i: number) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 text-xs"
                              >
                                <span className="font-mono text-[#566166]">
                                  {col.name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1 py-0"
                                >
                                  {col.type}
                                </Badge>
                                {col.nullable === false && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1 py-0"
                                  >
                                    NOT NULL
                                  </Badge>
                                )}
                                {col.primary_key && (
                                  <Badge className="text-[10px] px-1 py-0 bg-[#0053db]">
                                    PK
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
