import React, { useState, useCallback, useMemo } from "react";
import {
  Download, Loader2, ArrowLeft, LayoutGrid, RotateCw, Trash2,
  Copy, Plus, FileText, Check, AlertCircle, GripVertical,
  ChevronUp, ChevronDown, RotateCcw, FlipHorizontal, Undo2, Redo2
} from "lucide-react";
import { useNavigate } from "react-router";
import { FileUploader } from "./FileUploader";
import {
  type FileItem, type PageItem,
  getFileExtension, getFileTypeInfo, generateId, formatFileSize
} from "./store";
import { loadPdfFile, downloadBlob } from "./pdf-utils";
import { PDFDocument, degrees } from "pdf-lib";
import { usePdfThumbnails } from "./usePdfThumbnails";
import { motion } from "motion/react";

export function OrganizeWorkspace() {
  const navigate = useNavigate();
  const [file, setFile] = useState<FileItem | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [history, setHistory] = useState<PageItem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Generate real PDF thumbnails
  const { thumbnails, isLoading: thumbsLoading, progress: thumbsProgress } = usePdfThumbnails(
    file?.pdfData,
    file?.pageCount ?? 0,
    { thumbWidth: 220 }
  );

  const saveToHistory = useCallback((newPages: PageItem[]) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newPages]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setPages(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setPages(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  const handleFilesAdded = useCallback(async (newFiles: File[]) => {
    const f = newFiles[0];
    if (!f) return;

    setIsUploading(true);
    const ext = getFileExtension(f.name);
    const typeInfo = getFileTypeInfo(ext);
    const id = generateId();

    try {
      const result = await loadPdfFile(f);
      const fileItem: FileItem = {
        id,
        file: f,
        name: f.name,
        extension: ext,
        size: f.size,
        type: typeInfo.type,
        category: typeInfo.category,
        status: "ready",
        progress: 100,
        pageCount: result.pageCount,
        pages: result.pages.map(p => ({ ...p, fileId: id })),
        pdfData: result.pdfData,
        lastModified: f.lastModified,
      };
      setFile(fileItem);
      setPages(fileItem.pages);
      saveToHistory(fileItem.pages);
      setSelectedPages(new Set());
    } catch (error) {
      setFile({
        id,
        file: f,
        name: f.name,
        extension: ext,
        size: f.size,
        type: typeInfo.type,
        category: typeInfo.category,
        status: "error",
        progress: 0,
        pageCount: 0,
        pages: [],
        error: error instanceof Error ? error.message : "Failed to load PDF",
        lastModified: f.lastModified,
      });
    } finally {
      setIsUploading(false);
    }
  }, [saveToHistory]);

  const togglePageSelection = useCallback((pageId: string, e?: React.MouseEvent) => {
    setSelectedPages(prev => {
      const next = new Set(prev);
      if (e?.shiftKey && prev.size > 0) {
        const lastSelected = Array.from(prev).pop()!;
        const lastIdx = pages.findIndex(p => p.id === lastSelected);
        const currIdx = pages.findIndex(p => p.id === pageId);
        const [start, end] = lastIdx < currIdx ? [lastIdx, currIdx] : [currIdx, lastIdx];
        for (let i = start; i <= end; i++) {
          next.add(pages[i].id);
        }
      } else if (e?.ctrlKey || e?.metaKey) {
        next.has(pageId) ? next.delete(pageId) : next.add(pageId);
      } else {
        if (next.size === 1 && next.has(pageId)) {
          next.clear();
        } else {
          next.clear();
          next.add(pageId);
        }
      }
      return next;
    });
  }, [pages]);

  const selectAll = useCallback(() => {
    setSelectedPages(new Set(pages.map(p => p.id)));
  }, [pages]);

  const deselectAll = useCallback(() => {
    setSelectedPages(new Set());
  }, []);

  const rotateSelected = useCallback((deg: number) => {
    const newPages = pages.map(p =>
      selectedPages.has(p.id) ? { ...p, rotation: (p.rotation + deg + 360) % 360 } : p
    );
    setPages(newPages);
    saveToHistory(newPages);
  }, [pages, selectedPages, saveToHistory]);

  const deleteSelected = useCallback(() => {
    const newPages = pages.filter(p => !selectedPages.has(p.id));
    setPages(newPages);
    saveToHistory(newPages);
    setSelectedPages(new Set());
  }, [pages, selectedPages, saveToHistory]);

  const duplicateSelected = useCallback(() => {
    const newPages = [...pages];
    const selected = pages.filter(p => selectedPages.has(p.id));
    const lastSelectedIdx = Math.max(...selected.map(s => pages.indexOf(s)));
    const duplicated = selected.map(p => ({ ...p, id: generateId() }));
    newPages.splice(lastSelectedIdx + 1, 0, ...duplicated);
    setPages(newPages);
    saveToHistory(newPages);
  }, [pages, selectedPages, saveToHistory]);

  const insertBlankPage = useCallback(() => {
    const idx = selectedPages.size > 0
      ? Math.max(...Array.from(selectedPages).map(id => pages.findIndex(p => p.id === id))) + 1
      : pages.length;
    const blank: PageItem = {
      id: generateId(),
      fileId: file?.id || "",
      pageIndex: -1,
      rotation: 0,
      selected: false,
      width: 612,
      height: 792,
      isBlank: true,
      label: "Blank Page",
    };
    const newPages = [...pages];
    newPages.splice(idx, 0, blank);
    setPages(newPages);
    saveToHistory(newPages);
  }, [pages, selectedPages, file, saveToHistory]);

  const movePages = useCallback((direction: "up" | "down") => {
    const selectedIndices = Array.from(selectedPages)
      .map(id => pages.findIndex(p => p.id === id))
      .sort((a, b) => a - b);

    if (selectedIndices.length === 0) return;

    const newPages = [...pages];
    if (direction === "up" && selectedIndices[0] > 0) {
      for (const idx of selectedIndices) {
        [newPages[idx - 1], newPages[idx]] = [newPages[idx], newPages[idx - 1]];
      }
    } else if (direction === "down" && selectedIndices[selectedIndices.length - 1] < pages.length - 1) {
      for (const idx of [...selectedIndices].reverse()) {
        [newPages[idx + 1], newPages[idx]] = [newPages[idx], newPages[idx + 1]];
      }
    }
    setPages(newPages);
    saveToHistory(newPages);
  }, [pages, selectedPages, saveToHistory]);

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      const newPages = [...pages];
      const [moved] = newPages.splice(dragIndex, 1);
      newPages.splice(index, 0, moved);
      setPages(newPages);
      setDragIndex(index);
    }
  };
  const handleDragEnd = () => {
    if (dragIndex !== null) {
      saveToHistory(pages);
      setDragIndex(null);
    }
  };

  const handleExport = useCallback(async () => {
    if (!file?.pdfData) return;

    setIsProcessing(true);
    try {
      const srcDoc = await PDFDocument.load(file.pdfData, { ignoreEncryption: true });
      const newDoc = await PDFDocument.create();

      for (const page of pages) {
        if (page.isBlank) {
          newDoc.addPage([page.width, page.height]);
        } else if (page.pageIndex >= 0 && page.pageIndex < srcDoc.getPageCount()) {
          const [copiedPage] = await newDoc.copyPages(srcDoc, [page.pageIndex]);
          if (page.rotation !== 0) {
            copiedPage.setRotation(degrees(page.rotation));
          }
          newDoc.addPage(copiedPage);
        }
      }

      const pdfData = await newDoc.save();
      const name = file.name.replace(/\.pdf$/i, "_organized.pdf");
      downloadBlob(pdfData, name);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [file, pages]);

  return (
    <div className="min-h-full flex flex-col">
      {/* Toolbar */}
      <div className="sticky top-14 z-20 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 flex-wrap">
          <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-foreground mr-auto">Organize Pages</h2>

          {file && file.status === "ready" && (
            <>
              <button onClick={undo} disabled={historyIndex <= 0} className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors" aria-label="Undo">
                <Undo2 className="w-4 h-4" />
              </button>
              <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors" aria-label="Redo">
                <Redo2 className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-border hidden md:block" />
              <button
                onClick={() => rotateSelected(90)}
                disabled={selectedPages.size === 0}
                className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
                aria-label="Rotate right"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => rotateSelected(-90)}
                disabled={selectedPages.size === 0}
                className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
                aria-label="Rotate left"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={duplicateSelected}
                disabled={selectedPages.size === 0}
                className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
                aria-label="Duplicate"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={deleteSelected}
                disabled={selectedPages.size === 0}
                className="p-2 rounded-lg hover:bg-red-100 disabled:opacity-30 transition-colors text-muted-foreground hover:text-red-600"
                aria-label="Delete selected"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-border hidden md:block" />
              <button
                onClick={insertBlankPage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                style={{ fontSize: "0.875rem" }}
              >
                <Plus className="w-4 h-4" /> Blank Page
              </button>
              <button
                onClick={() => { setFile(null); setPages([]); setSelectedPages(new Set()); setHistory([]); setHistoryIndex(-1); }}
                className="p-2 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors text-muted-foreground"
                aria-label="Clear"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        {!file ? (
          <div className="max-w-2xl mx-auto mt-8">
            <FileUploader
              onFilesAdded={handleFilesAdded}
              label="Drop a PDF to organize"
              sublabel="Upload a PDF to rearrange, rotate, delete, or duplicate pages"
              accept=".pdf"
            />
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: LayoutGrid, title: "Visual Grid", desc: "See all pages as thumbnails" },
                { icon: RotateCw, title: "Rotate & Rearrange", desc: "Drag, rotate, and reorder pages" },
                { icon: Copy, title: "Duplicate & Insert", desc: "Copy pages or add blank pages" },
              ].map(item => (
                <div key={item.title} className="flex flex-col items-center text-center p-5 rounded-xl border border-border bg-card">
                  <item.icon className="w-5 h-5 text-muted-foreground mb-2" />
                  <h4 className="text-foreground mb-1">{item.title}</h4>
                  <p style={{ fontSize: "0.75rem" }} className="text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : file.status === "error" ? (
          <div className="max-w-md mx-auto mt-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-foreground mb-2">Failed to load PDF</h3>
            <p className="text-muted-foreground mb-4" style={{ fontSize: "0.875rem" }}>{file.error}</p>
            <button
              onClick={() => { setFile(null); setPages([]); }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Try Another File
            </button>
          </div>
        ) : (
          <div>
            {/* Selection Bar + Thumbnail Progress */}
            <div className="flex items-center gap-3 mb-4 text-muted-foreground" style={{ fontSize: "0.875rem" }}>
              <span>{pages.length} pages</span>
              {selectedPages.size > 0 && (
                <>
                  <span className="text-primary">{selectedPages.size} selected</span>
                  <button onClick={deselectAll} className="underline hover:text-foreground">Deselect</button>
                </>
              )}
              <button onClick={selectAll} className="underline hover:text-foreground">Select all</button>

              {thumbsLoading && (
                <span className="flex items-center gap-1.5 text-blue-600">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Rendering previews {thumbsProgress}%
                </span>
              )}

              <div className="flex-1" />
              <div className="hidden md:flex items-center gap-1">
                <button
                  onClick={() => movePages("up")}
                  disabled={selectedPages.size === 0}
                  className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
                  aria-label="Move up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => movePages("down")}
                  disabled={selectedPages.size === 0}
                  className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
                  aria-label="Move down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Thumbnail loading progress bar */}
            {thumbsLoading && (
              <div className="mb-4 w-full h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${thumbsProgress}%` }}
                />
              </div>
            )}

            {/* Page Grid with real thumbnails */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4">
              {pages.map((page, index) => {
                const thumbUrl = thumbnails.get(page.pageIndex);
                return (
                  <motion.div
                    key={page.id}
                    layout
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e as any, index)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => togglePageSelection(page.id, e)}
                    className={`relative group flex flex-col items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                      selectedPages.has(page.id)
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
                        : "border-border hover:border-primary/40 bg-card"
                    } ${dragIndex === index ? "opacity-50 scale-95" : ""}`}
                  >
                    {/* Thumbnail container */}
                    <div
                      className="relative w-full overflow-hidden rounded-lg bg-white shadow-sm"
                      style={{
                        aspectRatio: `${page.width}/${page.height}`,
                      }}
                    >
                      <div
                        className="w-full h-full"
                        style={{
                          transform: `rotate(${page.rotation}deg)`,
                          transformOrigin: "center",
                        }}
                      >
                        {page.isBlank ? (
                          <div className="w-full h-full flex items-center justify-center border border-dashed border-gray-300 rounded-lg bg-gray-50">
                            <span className="text-gray-400" style={{ fontSize: "0.75rem" }}>Blank Page</span>
                          </div>
                        ) : thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={`Page ${page.pageIndex + 1}`}
                            className="w-full h-full object-contain rounded-lg"
                            draggable={false}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
                            <Loader2 className="w-5 h-5 text-muted-foreground/40 animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Drag handle overlay on hover */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/5 transition-colors rounded-lg">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white/80 rounded-lg shadow-sm backdrop-blur-sm">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>

                    {/* Page label */}
                    <span
                      style={{ fontSize: "0.75rem" }}
                      className={`tabular-nums ${selectedPages.has(page.id) ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {index + 1}
                    </span>

                    {/* Selection badge */}
                    {selectedPages.has(page.id) && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-sm z-10">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}

                    {/* Rotation indicator */}
                    {page.rotation !== 0 && (
                      <div className="absolute top-1 left-1 px-1 py-0.5 bg-blue-500 rounded-md flex items-center gap-0.5 z-10">
                        <RotateCw className="w-2.5 h-2.5 text-white" />
                        <span className="text-white" style={{ fontSize: "0.5rem" }}>{page.rotation}°</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      {file && file.status === "ready" && pages.length > 0 && (
        <div className="sticky bottom-0 z-20 bg-card/95 backdrop-blur-sm border-t border-border">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-muted-foreground" style={{ fontSize: "0.875rem" }}>
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                {pages.length} pages
              </span>
              <span className="hidden sm:inline">{file.name}</span>
            </div>

            <button
              onClick={handleExport}
              disabled={isProcessing || pages.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isProcessing ? "Exporting..." : "Export PDF"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
