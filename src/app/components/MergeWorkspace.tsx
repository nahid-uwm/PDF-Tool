import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Download, Loader2, ArrowLeft, LayoutGrid, List, SortAsc,
  Undo2, Redo2, FileText, Trash2, Eye, Settings2, ChevronRight,
  ArrowUpDown, CheckCircle2, AlertCircle, Plus, GripVertical
} from "lucide-react";
import { useNavigate } from "react-router";
import { FileUploader } from "./FileUploader";
import { FileCard } from "./FileCard";
import { OutputSettingsPanel } from "./OutputSettings";
import {
  type FileItem, type PageItem, type OutputSettings,
  getFileExtension, getFileTypeInfo, generateId, formatFileSize, defaultOutputSettings
} from "./store";
import { loadPdfFile, createImagePdf, createTextPdf, mergePdfs, downloadBlob } from "./pdf-utils";
import { convertFileToPdf } from "./file-converters";
import { motion, AnimatePresence } from "motion/react";

type SortMode = "upload" | "name-asc" | "name-desc" | "size-asc" | "size-desc" | "pages-asc" | "pages-desc" | "type";
type ViewMode = "cards" | "list" | "thumbnails";

export function MergeWorkspace() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<SortMode>("upload");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [settings, setSettings] = useState<OutputSettings>(defaultOutputSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<FileItem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const saveHistory = useCallback((newFiles: FileItem[]) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newFiles]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setFiles(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setFiles(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  const processFile = useCallback(async (file: File): Promise<FileItem> => {
    const ext = getFileExtension(file.name);
    const typeInfo = getFileTypeInfo(ext);
    const id = generateId();

    const fileItem: FileItem = {
      id,
      file,
      name: file.name,
      extension: ext,
      size: file.size,
      type: typeInfo.type,
      category: typeInfo.category,
      status: "pending",
      progress: 0,
      pageCount: 0,
      pages: [],
      lastModified: file.lastModified,
    };

    try {
      fileItem.status = "converting";
      fileItem.progress = 30;

      let result;
      if (ext === "pdf") {
        result = await loadPdfFile(file);
      } else if (["jpg", "jpeg", "png"].includes(ext)) {
        result = await createImagePdf(file);
      } else if (["txt", "md", "markdown", "csv", "tsv"].includes(ext)) {
        result = await createTextPdf(file);
      } else {
        result = await convertFileToPdf(file, ext, typeInfo.category);
      }

      fileItem.progress = 100;
      fileItem.status = "ready";
      fileItem.pageCount = result.pageCount;
      fileItem.pdfData = result.pdfData;
      fileItem.pages = result.pages.map(p => ({ ...p, fileId: id }));
      if (fileItem.pages.length > 0) {
        fileItem.dimensions = { width: fileItem.pages[0].width, height: fileItem.pages[0].height };
      }
    } catch (error) {
      fileItem.status = "error";
      fileItem.error = error instanceof Error ? error.message : "Conversion failed";
    }

    return fileItem;
  }, []);

  const handleFilesAdded = useCallback(async (newFiles: File[]) => {
    const pendingItems: FileItem[] = newFiles.map(file => {
      const ext = getFileExtension(file.name);
      const typeInfo = getFileTypeInfo(ext);
      return {
        id: generateId(),
        file,
        name: file.name,
        extension: ext,
        size: file.size,
        type: typeInfo.type,
        category: typeInfo.category,
        status: "pending" as const,
        progress: 0,
        pageCount: 0,
        pages: [],
        lastModified: file.lastModified,
      };
    });

    setFiles(prev => [...prev, ...pendingItems]);

    for (const item of pendingItems) {
      const processed = await processFile(item.file);
      processed.id = item.id;
      processed.pages = processed.pages.map(p => ({ ...p, fileId: item.id }));

      setFiles(prev => {
        const updated = prev.map(f => f.id === item.id ? processed : f);
        saveHistory(updated);
        return updated;
      });
    }
  }, [processFile, saveHistory]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== id);
      saveHistory(updated);
      return updated;
    });
  }, [saveHistory]);

  const moveFile = useCallback((fromIndex: number, toIndex: number) => {
    setFiles(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      saveHistory(updated);
      return updated;
    });
  }, [saveHistory]);

  const togglePage = useCallback((fileId: string, pageId: string) => {
    setFiles(prev =>
      prev.map(f =>
        f.id === fileId
          ? { ...f, pages: f.pages.map(p => p.id === pageId ? { ...p, selected: !p.selected } : p) }
          : f
      )
    );
  }, []);

  const rotatePage = useCallback((fileId: string, pageId: string) => {
    setFiles(prev =>
      prev.map(f =>
        f.id === fileId
          ? { ...f, pages: f.pages.map(p => p.id === pageId ? { ...p, rotation: (p.rotation + 90) % 360 } : p) }
          : f
      )
    );
  }, []);

  const deletePage = useCallback((fileId: string, pageId: string) => {
    setFiles(prev =>
      prev.map(f =>
        f.id === fileId
          ? { ...f, pages: f.pages.filter(p => p.id !== pageId), pageCount: f.pages.filter(p => p.id !== pageId).length }
          : f
      )
    );
  }, []);

  const sortedFiles = useCallback(() => {
    const sorted = [...files];
    switch (sortMode) {
      case "name-asc": sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "name-desc": sorted.sort((a, b) => b.name.localeCompare(a.name)); break;
      case "size-asc": sorted.sort((a, b) => a.size - b.size); break;
      case "size-desc": sorted.sort((a, b) => b.size - a.size); break;
      case "pages-asc": sorted.sort((a, b) => a.pageCount - b.pageCount); break;
      case "pages-desc": sorted.sort((a, b) => b.pageCount - a.pageCount); break;
      case "type": sorted.sort((a, b) => a.type.localeCompare(b.type)); break;
    }
    return sorted;
  }, [files, sortMode])();

  const handleMerge = useCallback(async () => {
    const readyFiles = sortedFiles.filter(f => f.status === "ready");
    if (readyFiles.length === 0) return;

    setIsProcessing(true);
    try {
      const mergedData = await mergePdfs(readyFiles, settings);
      const filename = settings.metadata.title
        ? `${settings.metadata.title}.pdf`
        : `merged_${readyFiles.length}_files.pdf`;
      downloadBlob(mergedData, filename);
    } catch (error) {
      console.error("Merge failed:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [sortedFiles, settings]);

  const clearAll = useCallback(() => {
    setFiles([]);
    setHistory([]);
    setHistoryIndex(-1);
    setExpandedFiles(new Set());
  }, []);

  const totalPages = files.reduce((sum, f) => sum + f.pageCount, 0);
  const readyCount = files.filter(f => f.status === "ready").length;
  const errorCount = files.filter(f => f.status === "error").length;
  const processingCount = files.filter(f => f.status === "converting" || f.status === "pending").length;
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      moveFile(dragIndex, index);
      setDragIndex(index);
    }
  };
  const handleDragEnd = () => setDragIndex(null);

  return (
    <div className="min-h-full flex flex-col">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-foreground mr-auto">Merge PDFs</h2>

          {files.length > 0 && (
            <>
              <FileUploader onFilesAdded={handleFilesAdded} compact />

              <div className="hidden md:flex items-center border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode("cards")}
                  className={`p-2 transition-colors ${viewMode === "cards" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  aria-label="Card view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  aria-label="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="hidden md:block px-3 py-1.5 rounded-lg border border-border bg-input-background text-foreground"
                style={{ fontSize: "0.875rem" }}
                aria-label="Sort order"
              >
                <option value="upload">Upload Order</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="size-asc">Size (Small)</option>
                <option value="size-desc">Size (Large)</option>
                <option value="pages-asc">Pages (Low)</option>
                <option value="pages-desc">Pages (High)</option>
                <option value="type">File Type</option>
              </select>

              <button onClick={undo} disabled={historyIndex <= 0} className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors" aria-label="Undo">
                <Undo2 className="w-4 h-4" />
              </button>
              <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors" aria-label="Redo">
                <Redo2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-colors ${showSettings ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                aria-label="Output settings"
              >
                <Settings2 className="w-4 h-4" />
              </button>

              <button
                onClick={clearAll}
                className="p-2 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors text-muted-foreground"
                aria-label="Clear all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        <div className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
          {files.length === 0 ? (
            <div className="max-w-2xl mx-auto mt-8">
              <FileUploader
                onFilesAdded={handleFilesAdded}
                label="Drop files to merge into one PDF"
                sublabel="PDF, Word, Excel, PowerPoint, Images, and 50+ formats. All files will be merged."
              />
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: ArrowUpDown, title: "Reorder & Organize", desc: "Drag files and pages into any order" },
                  { icon: Eye, title: "Visual Preview", desc: "See page thumbnails before merging" },
                  { icon: FileText, title: "Smart TOC", desc: "Auto-generate table of contents" },
                ].map(item => (
                  <div key={item.title} className="flex flex-col items-center text-center p-5 rounded-xl border border-border bg-card">
                    <item.icon className="w-5 h-5 text-muted-foreground mb-2" />
                    <h4 className="text-foreground mb-1">{item.title}</h4>
                    <p style={{ fontSize: "0.75rem" }} className="text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex gap-6">
              {/* File List */}
              <div className="flex-1 space-y-3">
                <AnimatePresence>
                  {sortedFiles.map((file, index) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e as any, index)}
                      onDragEnd={handleDragEnd}
                      className={dragIndex === index ? "opacity-50" : ""}
                    >
                      <FileCard
                        file={file}
                        index={index}
                        isExpanded={expandedFiles.has(file.id)}
                        onToggleExpand={() => {
                          setExpandedFiles(prev => {
                            const next = new Set(prev);
                            next.has(file.id) ? next.delete(file.id) : next.add(file.id);
                            return next;
                          });
                        }}
                        onRemove={() => removeFile(file.id)}
                        onMoveUp={index > 0 ? () => moveFile(index, index - 1) : undefined}
                        onMoveDown={index < files.length - 1 ? () => moveFile(index, index + 1) : undefined}
                        onRetry={file.status === "error" ? async () => {
                          const processed = await processFile(file.file);
                          processed.id = file.id;
                          setFiles(prev => prev.map(f => f.id === file.id ? processed : f));
                        } : undefined}
                        onPageSelect={(pageId) => togglePage(file.id, pageId)}
                        onPageRotate={(pageId) => rotatePage(file.id, pageId)}
                        onPageDelete={(pageId) => deletePage(file.id, pageId)}
                        isDraggable
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Add more files area */}
                <div className="mt-4">
                  <FileUploader onFilesAdded={handleFilesAdded} compact />
                </div>
              </div>

              {/* Settings Sidebar */}
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="hidden lg:block w-80 flex-shrink-0"
                >
                  <div className="sticky top-20 space-y-3 max-h-[calc(100vh-120px)] overflow-y-auto pr-1">
                    <h3 className="text-foreground mb-3">Output Settings</h3>
                    <OutputSettingsPanel settings={settings} onChange={setSettings} />
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      {files.length > 0 && (
        <div className="sticky bottom-0 z-20 bg-card/95 backdrop-blur-sm border-t border-border">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-muted-foreground" style={{ fontSize: "0.875rem" }}>
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                {files.length} {files.length === 1 ? "file" : "files"}
              </span>
              <span className="hidden sm:inline">{totalPages} pages</span>
              <span className="hidden md:inline">{formatFileSize(totalSize)}</span>
              {readyCount > 0 && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {readyCount} ready
                </span>
              )}
              {errorCount > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="w-3.5 h-3.5" /> {errorCount} failed
                </span>
              )}
              {processingCount > 0 && (
                <span className="flex items-center gap-1 text-blue-600">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> {processingCount} processing
                </span>
              )}
            </div>

            <button
              onClick={handleMerge}
              disabled={readyCount < 1 || isProcessing}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isProcessing ? "Merging..." : "Merge & Download"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}