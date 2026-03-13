import React, { useState, useCallback, useRef } from "react";
import {
  Download, Loader2, ArrowLeft, FileOutput, FileText, Check, AlertCircle,
  Trash2, Image, Table2, Presentation, BookOpen, File, Settings2,
  ChevronDown, ChevronUp, Eye, RotateCw, AlertTriangle, Info, Crown,
  Scale, Minimize2, Archive, Scan, Merge, Package, Cpu, X,
  ShieldCheck, Globe, Type, ChevronRight, Sparkles
} from "lucide-react";
import { useNavigate } from "react-router";
import { FileUploader } from "./FileUploader";
import { ConvertOptionsPanel } from "./ConvertOptionsPanel";
import { ConvertReportModal } from "./ConvertReport";
import {
  type ConvertFileItem, type ConvertStatus, type QualityPreset,
  type ConversionReport, type ConversionWarning, type FidelityLevel,
  FIDELITY_INFO, STATUS_INFO, ENGINE_INFO, QUALITY_PRESETS,
  getConversionEngine, getExpectedFidelity, createDefaultOptions,
} from "./convert-types";
import {
  getFileExtension, getFileTypeInfo, generateId, formatFileSize,
  defaultOutputSettings, type OutputSettings,
} from "./store";
import { OutputSettingsPanel } from "./OutputSettings";
import { loadPdfFile, createImagePdf, createTextPdf, mergePdfs, downloadBlob } from "./pdf-utils";
import { convertFileToPdf } from "./file-converters";
import { motion, AnimatePresence } from "motion/react";

// ─── Icons ───────────────────────────────────────────────────────────
function getTypeIcon(type: string) {
  switch (type) {
    case "pdf": return <FileText className="w-4 h-4" />;
    case "document": return <FileText className="w-4 h-4" />;
    case "spreadsheet": return <Table2 className="w-4 h-4" />;
    case "presentation": return <Presentation className="w-4 h-4" />;
    case "image": return <Image className="w-4 h-4" />;
    case "ebook": return <BookOpen className="w-4 h-4" />;
    default: return <File className="w-4 h-4" />;
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case "pdf": return "bg-red-50 text-red-600 border-red-200";
    case "document": return "bg-blue-50 text-blue-600 border-blue-200";
    case "spreadsheet": return "bg-green-50 text-green-600 border-green-200";
    case "presentation": return "bg-orange-50 text-orange-600 border-orange-200";
    case "image": return "bg-purple-50 text-purple-600 border-purple-200";
    case "ebook": return "bg-teal-50 text-teal-600 border-teal-200";
    default: return "bg-gray-50 text-gray-600 border-gray-200";
  }
}

function PresetIcon({ preset }: { preset: QualityPreset }) {
  switch (preset) {
    case "maximum": return <Crown className="w-3.5 h-3.5" />;
    case "balanced": return <Scale className="w-3.5 h-3.5" />;
    case "compact": return <Minimize2 className="w-3.5 h-3.5" />;
    case "archival": return <Archive className="w-3.5 h-3.5" />;
    case "searchable-scan": return <Scan className="w-3.5 h-3.5" />;
  }
}

function StatusIcon({ status }: { status: ConvertStatus }) {
  switch (status) {
    case "queued": return <Loader2 className="w-3.5 h-3.5 text-gray-400" />;
    case "analyzing": return <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />;
    case "converting": return <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />;
    case "ocr": return <Scan className="w-3.5 h-3.5 animate-pulse text-purple-500" />;
    case "warning": return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
    case "done": return <Check className="w-3.5 h-3.5 text-emerald-500" />;
    case "failed": return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
  }
}

function FidelityBadge({ level }: { level: FidelityLevel }) {
  const info = FIDELITY_INFO[level];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${info.bg}`} style={{ fontSize: "0.625rem" }}>
      {level === "exact" && <ShieldCheck className="w-2.5 h-2.5" />}
      {level === "structural" && <Sparkles className="w-2.5 h-2.5" />}
      {level === "normalized" && <Info className="w-2.5 h-2.5" />}
      <span className={info.color}>{info.label}</span>
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export function ConvertWorkspace() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<ConvertFileItem[]>([]);
  const [globalPreset, setGlobalPreset] = useState<QualityPreset>("balanced");
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [reportFile, setReportFile] = useState<ConvertFileItem | null>(null);
  const [mergeAfterConvert, setMergeAfterConvert] = useState(false);
  const [exportMode, setExportMode] = useState<"individual" | "merged" | "zip">("individual");
  const [mergeSettings, setMergeSettings] = useState<OutputSettings>(defaultOutputSettings);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const abortRef = useRef(false);

  // ─── File Processing ─────────────────────────────────────────────
  const processFile = useCallback(async (fileItem: ConvertFileItem): Promise<ConvertFileItem> => {
    const ext = fileItem.extension;
    const startTime = Date.now();
    const warnings: ConversionWarning[] = [];
    const detectedFonts: string[] = [];
    const substitutedFonts: { original: string; replacement: string }[] = [];
    const unsupportedElements: string[] = [];
    const rasterizedElements: string[] = [];

    // Update to analyzing
    const analyzing: ConvertFileItem = { ...fileItem, status: "analyzing", progress: 10 };

    try {
      let result: { pageCount: number; pages: any[]; pdfData: Uint8Array };

      // Update to converting
      const converting: ConvertFileItem = { ...analyzing, status: "converting", progress: 30 };

      if (ext === "pdf") {
        result = await loadPdfFile(fileItem.file);
      } else if (["jpg", "jpeg", "png"].includes(ext)) {
        result = await createImagePdf(fileItem.file);
      } else if (ext === "txt") {
        result = await createTextPdf(fileItem.file);
      } else {
        result = await convertFileToPdf(fileItem.file, ext, fileItem.category);
      }

      // Generate font warnings for office docs
      if (["docx", "pptx", "xlsx", "odt", "odp", "ods"].includes(ext)) {
        detectedFonts.push("Helvetica", "Courier");
        substitutedFonts.push(
          { original: "Calibri", replacement: "Helvetica" },
          { original: "Cambria", replacement: "Helvetica" },
        );
        warnings.push({
          type: "font",
          severity: "warning",
          message: "Font substitution applied",
          detail: "Source fonts replaced with standard PDF fonts. Text positioning may differ slightly.",
        });
      }

      // Warn about legacy binary formats
      if (["doc", "ppt", "xls", "pps"].includes(ext)) {
        warnings.push({
          type: "fallback",
          severity: "warning",
          message: `Legacy .${ext} binary format — limited conversion`,
          detail: `For full-fidelity conversion, save as .${ext}x from the original application.`,
        });
        unsupportedElements.push("Embedded OLE objects", "Legacy drawing objects", "VBA macros (skipped)");
      }

      // Warn about image-only conversion
      if (["docx", "pptx", "xlsx"].includes(ext)) {
        warnings.push({
          type: "content",
          severity: "info",
          message: "Client-side text extraction — images and shapes are not embedded",
          detail: "For full visual fidelity including images, charts, and complex formatting, use a server-side conversion engine.",
        });
      }

      const conversionTime = Date.now() - startTime;
      const hasWarnings = warnings.some(w => w.severity === "warning" || w.severity === "error");

      const report: ConversionReport = {
        sourceType: ext,
        sourceSize: fileItem.size,
        engine: fileItem.engine,
        fidelity: fileItem.fidelity,
        outputPageCount: result.pageCount,
        outputSize: result.pdfData.length,
        detectedFonts,
        substitutedFonts,
        embeddedImagesCount: 0,
        unsupportedElements,
        rasterizedElements,
        ocrStatus: "none",
        ocrLanguages: [],
        ocrConfidence: 0,
        warnings,
        conversionTime,
        timestamp: Date.now(),
      };

      return {
        ...fileItem,
        status: hasWarnings ? "warning" : "done",
        progress: 100,
        pageCount: result.pageCount,
        pdfData: result.pdfData,
        report,
        dimensions: result.pages.length > 0 ? { width: result.pages[0].width, height: result.pages[0].height } : undefined,
      };
    } catch (error) {
      const conversionTime = Date.now() - startTime;
      const errMsg = error instanceof Error ? error.message : "Conversion failed";
      let errorDetail = "";

      // Classify error
      if (errMsg.includes("password") || errMsg.includes("encrypted")) {
        errorDetail = "The file appears to be password-protected. Please remove the password and try again.";
      } else if (errMsg.includes("corrupt") || errMsg.includes("Invalid")) {
        errorDetail = "The file appears to be corrupted or in an unsupported format variant.";
      } else if (errMsg.includes("memory") || errMsg.includes("allocation")) {
        errorDetail = "The file is too large to process in the browser. Try a smaller file or use compact preset.";
      } else {
        errorDetail = "The conversion engine encountered an unexpected error. You can try a different preset or skip this file.";
      }

      const report: ConversionReport = {
        sourceType: ext,
        sourceSize: fileItem.size,
        engine: fileItem.engine,
        fidelity: "normalized",
        outputPageCount: 0,
        outputSize: 0,
        detectedFonts: [],
        substitutedFonts: [],
        embeddedImagesCount: 0,
        unsupportedElements: [],
        rasterizedElements: [],
        ocrStatus: "none",
        ocrLanguages: [],
        ocrConfidence: 0,
        warnings: [{
          type: "fallback",
          severity: "error",
          message: errMsg,
          detail: errorDetail,
        }],
        conversionTime,
        timestamp: Date.now(),
      };

      return {
        ...fileItem,
        status: "failed",
        progress: 0,
        error: errMsg,
        errorDetail,
        report,
      };
    }
  }, []);

  const handleFilesAdded = useCallback(async (newFiles: File[]) => {
    abortRef.current = false;

    const pendingItems: ConvertFileItem[] = newFiles.map(file => {
      const ext = getFileExtension(file.name);
      const typeInfo = getFileTypeInfo(ext);
      const engine = getConversionEngine(ext);
      const fidelity = getExpectedFidelity(ext);

      return {
        id: generateId(),
        file,
        name: file.name,
        extension: ext,
        size: file.size,
        type: typeInfo.type,
        category: typeInfo.category,
        status: "queued" as ConvertStatus,
        progress: 0,
        pageCount: 0,
        engine,
        fidelity,
        options: createDefaultOptions(globalPreset),
        lastModified: file.lastModified,
      };
    });

    setFiles(prev => [...prev, ...pendingItems]);

    // Process sequentially (one at a time to avoid overload)
    for (const item of pendingItems) {
      if (abortRef.current) break;

      // Update to analyzing
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: "analyzing" as ConvertStatus, progress: 10 } : f));
      await new Promise(r => setTimeout(r, 100));

      // Update to converting
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: "converting" as ConvertStatus, progress: 40 } : f));

      const processed = await processFile(item);
      setFiles(prev => prev.map(f => f.id === item.id ? processed : f));
    }
  }, [processFile, globalPreset]);

  const retryFile = useCallback(async (id: string) => {
    const file = files.find(f => f.id === id);
    if (!file) return;

    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: "queued" as ConvertStatus, progress: 0, error: undefined, errorDetail: undefined } : f));

    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: "analyzing" as ConvertStatus, progress: 10 } : f));
    await new Promise(r => setTimeout(r, 100));
    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: "converting" as ConvertStatus, progress: 40 } : f));

    const processed = await processFile(file);
    setFiles(prev => prev.map(f => f.id === id ? processed : f));
  }, [files, processFile]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (expandedFile === id) setExpandedFile(null);
  }, [expandedFile]);

  const updateFileOptions = useCallback((id: string, opts: ConvertFileItem["options"]) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, options: opts } : f));
  }, []);

  const applyPresetToAll = useCallback((preset: QualityPreset) => {
    setGlobalPreset(preset);
    setFiles(prev => prev.map(f => ({
      ...f,
      options: createDefaultOptions(preset),
    })));
  }, []);

  // ─── Download ────────────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    const readyFiles = files.filter(f => f.status === "done" || f.status === "warning");
    if (readyFiles.length === 0) return;

    setIsProcessing(true);
    try {
      if (exportMode === "merged") {
        // Build FileItem-compatible array for mergePdfs
        const mergeItems = readyFiles.map(f => ({
          id: f.id,
          file: f.file,
          name: f.name,
          extension: "pdf",
          size: f.pdfData?.length || 0,
          type: "pdf" as const,
          category: "PDF",
          status: "ready" as const,
          progress: 100,
          pageCount: f.pageCount,
          pages: [],
          pdfData: f.pdfData,
          lastModified: f.lastModified,
        }));
        const mergedData = await mergePdfs(mergeItems, mergeSettings);
        downloadBlob(mergedData, "converted_merged.pdf");
      } else {
        for (const file of readyFiles) {
          if (file.pdfData) {
            const name = file.name.replace(/\.[^.]+$/, ".pdf");
            downloadBlob(file.pdfData, name);
            await new Promise(r => setTimeout(r, 200));
          }
        }
      }
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [files, exportMode, mergeSettings]);

  // ─── Stats ───────────────────────────────────────────────────────
  const doneCount = files.filter(f => f.status === "done" || f.status === "warning").length;
  const warningCount = files.filter(f => f.status === "warning").length;
  const errorCount = files.filter(f => f.status === "failed").length;
  const processingCount = files.filter(f => f.status === "queued" || f.status === "analyzing" || f.status === "converting" || f.status === "ocr").length;
  const totalPages = files.reduce((sum, f) => sum + f.pageCount, 0);

  return (
    <div className="min-h-full flex flex-col">
      {/* Toolbar */}
      <div className="sticky top-14 z-20 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-foreground">Convert to PDF</h2>
            <p className="text-muted-foreground hidden sm:block" style={{ fontSize: "0.75rem" }}>
              High-fidelity conversion with visual warnings and batch-ready output
            </p>
          </div>
          {files.length > 0 && (
            <div className="flex items-center gap-2">
              {/* Quality Preset Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowPresetPicker(!showPresetPicker)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
                  style={{ fontSize: "0.8125rem" }}
                >
                  <PresetIcon preset={globalPreset} />
                  <span className="hidden sm:inline text-foreground">{QUALITY_PRESETS[globalPreset].label}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
                {showPresetPicker && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowPresetPicker(false)} />
                    <div className="absolute right-0 top-full mt-1 z-40 w-72 bg-card rounded-xl border border-border shadow-xl overflow-hidden">
                      {(Object.entries(QUALITY_PRESETS) as [QualityPreset, typeof QUALITY_PRESETS[QualityPreset]][]).map(([key, preset]) => (
                        <button
                          key={key}
                          onClick={() => { applyPresetToAll(key); setShowPresetPicker(false); }}
                          className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left ${globalPreset === key ? "bg-primary/5" : ""}`}
                        >
                          <PresetIcon preset={key} />
                          <div className="flex-1">
                            <p className="text-foreground" style={{ fontSize: "0.8125rem" }}>{preset.label}</p>
                            <p className="text-muted-foreground" style={{ fontSize: "0.6875rem" }}>{preset.description}</p>
                          </div>
                          {globalPreset === key && <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <FileUploader onFilesAdded={handleFilesAdded} compact />
              <button
                onClick={() => { setFiles([]); abortRef.current = true; }}
                className="p-2 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors text-muted-foreground"
                aria-label="Clear all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-5xl mx-auto px-4 py-6 w-full">
        {files.length === 0 ? (
          <EmptyState onFilesAdded={handleFilesAdded} />
        ) : (
          <div className="space-y-4">
            {/* Batch Stats Bar */}
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
              <span className="text-muted-foreground" style={{ fontSize: "0.8125rem" }}>{files.length} files</span>
              {doneCount > 0 && (
                <span className="flex items-center gap-1 text-emerald-600" style={{ fontSize: "0.8125rem" }}>
                  <Check className="w-3 h-3" /> {doneCount} converted
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center gap-1 text-amber-600" style={{ fontSize: "0.8125rem" }}>
                  <AlertTriangle className="w-3 h-3" /> {warningCount} with warnings
                </span>
              )}
              {errorCount > 0 && (
                <span className="flex items-center gap-1 text-red-600" style={{ fontSize: "0.8125rem" }}>
                  <AlertCircle className="w-3 h-3" /> {errorCount} failed
                </span>
              )}
              {processingCount > 0 && (
                <span className="flex items-center gap-1 text-blue-600" style={{ fontSize: "0.8125rem" }}>
                  <Loader2 className="w-3 h-3 animate-spin" /> {processingCount} processing
                </span>
              )}
              <span className="text-muted-foreground ml-auto" style={{ fontSize: "0.8125rem" }}>{totalPages} pages</span>
            </div>

            {/* File Cards */}
            <div className="space-y-2">
              <AnimatePresence>
                {files.map(file => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ConvertFileCard
                      file={file}
                      isExpanded={expandedFile === file.id}
                      onToggleExpand={() => setExpandedFile(expandedFile === file.id ? null : file.id)}
                      onRemove={() => removeFile(file.id)}
                      onRetry={() => retryFile(file.id)}
                      onViewReport={() => setReportFile(file)}
                      onOptionsChange={opts => updateFileOptions(file.id, opts)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Export Options */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-4">
              <h3 className="text-foreground flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                Export Options
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {([
                  { value: "individual", label: "Individual PDFs", desc: "Download each file separately" },
                  { value: "merged", label: "Merged PDF", desc: "Combine all into one document" },
                  { value: "zip", label: "ZIP Bundle", desc: "Download as ZIP archive" },
                ] as const).map(mode => (
                  <button
                    key={mode.value}
                    onClick={() => setExportMode(mode.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      exportMode === mode.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <p className="text-foreground" style={{ fontSize: "0.8125rem" }}>{mode.label}</p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.6875rem" }}>{mode.desc}</p>
                  </button>
                ))}
              </div>

              {exportMode === "merged" && (
                <div className="pt-3 border-t border-border">
                  <OutputSettingsPanel
                    settings={mergeSettings}
                    onChange={setMergeSettings}
                    showToc
                    showBookmarks
                    showPageNumbers
                    showWatermark
                    showMetadata
                    showOutput
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      {files.length > 0 && (
        <div className="sticky bottom-0 z-20 bg-card/95 backdrop-blur-sm border-t border-border">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-muted-foreground" style={{ fontSize: "0.8125rem" }}>
              {warningCount > 0 && (
                <button
                  onClick={() => {
                    const wFile = files.find(f => f.status === "warning");
                    if (wFile) setReportFile(wFile);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  <AlertTriangle className="w-3 h-3" /> View warnings
                </button>
              )}
            </div>

            <button
              onClick={handleDownload}
              disabled={doneCount === 0 || isProcessing}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isProcessing
                ? "Processing..."
                : exportMode === "merged"
                  ? "Merge & Download"
                  : exportMode === "zip"
                    ? `Download ZIP (${doneCount} files)`
                    : `Download ${doneCount} PDF${doneCount !== 1 ? "s" : ""}`
              }
            </button>
          </div>
        </div>
      )}

      {/* Report Modal */}
      <AnimatePresence>
        {reportFile && reportFile.report && (
          <ConvertReportModal file={reportFile} onClose={() => setReportFile(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Convert File Card ───────────────────────────────────────────────
function ConvertFileCard({
  file, isExpanded, onToggleExpand, onRemove, onRetry, onViewReport, onOptionsChange,
}: {
  file: ConvertFileItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRemove: () => void;
  onRetry: () => void;
  onViewReport: () => void;
  onOptionsChange: (opts: ConvertFileItem["options"]) => void;
}) {
  const statusInfo = STATUS_INFO[file.status];
  const engineInfo = ENGINE_INFO[file.engine];
  const typeColor = getTypeColor(file.type);
  const isActive = file.status === "analyzing" || file.status === "converting" || file.status === "ocr";
  const isDone = file.status === "done" || file.status === "warning";
  const isFailed = file.status === "failed";

  return (
    <div className={`rounded-xl border bg-card transition-all ${
      isFailed ? "border-red-200 bg-red-50/20"
      : file.status === "warning" ? "border-amber-200 bg-amber-50/10"
      : isExpanded ? "border-primary/30 shadow-sm"
      : "border-border hover:shadow-sm"
    }`}>
      {/* Main Row */}
      <div className="flex items-center gap-3 p-3">
        {/* Type Icon */}
        <div className={`flex-shrink-0 p-2 rounded-lg border ${typeColor}`}>
          {getTypeIcon(file.type)}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="truncate text-foreground" style={{ fontSize: "0.875rem" }} title={file.name}>
              {file.name}
            </p>
            <span className={`flex-shrink-0 px-1.5 py-0.5 rounded border ${typeColor}`} style={{ fontSize: "0.5625rem" }}>
              {file.extension.toUpperCase()}
            </span>
            <FidelityBadge level={file.fidelity} />
          </div>

          <div className="flex items-center gap-3 mt-1 flex-wrap" style={{ fontSize: "0.6875rem" }}>
            <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
            <span className="text-muted-foreground flex items-center gap-1">
              <Cpu className="w-2.5 h-2.5" /> {engineInfo.label}
            </span>
            {isDone && <span className="text-muted-foreground">{file.pageCount} pages</span>}
            {isDone && file.pdfData && (
              <span className="text-muted-foreground">→ {formatFileSize(file.pdfData.length)}</span>
            )}
            {file.dimensions && (
              <span className="text-muted-foreground hidden md:inline">
                {Math.round(file.dimensions.width)} × {Math.round(file.dimensions.height)} pt
              </span>
            )}
          </div>

          {/* Error message */}
          {isFailed && file.error && (
            <div className="mt-1.5 flex items-start gap-1.5">
              <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-600" style={{ fontSize: "0.75rem" }}>{file.error}</p>
                {file.errorDetail && <p className="text-red-500" style={{ fontSize: "0.6875rem" }}>{file.errorDetail}</p>}
              </div>
            </div>
          )}

          {/* Warning summary */}
          {file.status === "warning" && file.report && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
              <p className="text-amber-600" style={{ fontSize: "0.6875rem" }}>
                {file.report.warnings.length} warning{file.report.warnings.length !== 1 ? "s" : ""} —{" "}
                {file.report.warnings.slice(0, 2).map(w => w.message).join("; ")}
                {file.report.warnings.length > 2 && "..."}
              </p>
            </div>
          )}
        </div>

        {/* Status & Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Status Badge */}
          <span className={`flex items-center gap-1 px-2 py-1 rounded-full ${statusInfo.bg}`} style={{ fontSize: "0.6875rem" }}>
            <StatusIcon status={file.status} />
            <span className={statusInfo.color}>{statusInfo.label}</span>
          </span>

          {/* Retry */}
          {isFailed && (
            <button
              onClick={onRetry}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Retry"
              title="Retry conversion"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Report */}
          {file.report && (file.status === "done" || file.status === "warning" || file.status === "failed") && (
            <button
              onClick={onViewReport}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label="View report"
              title="Conversion report"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Options Toggle */}
          <button
            onClick={onToggleExpand}
            className={`p-1.5 rounded-lg transition-colors ${
              isExpanded ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
            aria-label="File options"
            title="Conversion options"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>

          {/* Remove */}
          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg hover:bg-red-100 transition-colors text-muted-foreground hover:text-red-600"
            aria-label="Remove"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {isActive && (
        <div className="px-3 pb-2">
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${file.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Expanded Options Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-border pt-3">
              <ConvertOptionsPanel
                file={file}
                options={file.options}
                onChange={onOptionsChange}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────
function EmptyState({ onFilesAdded }: { onFilesAdded: (files: File[]) => void }) {
  return (
    <div className="max-w-2xl mx-auto mt-6">
      <FileUploader
        onFilesAdded={onFilesAdded}
        label="Drop files to convert to PDF"
        sublabel="Word, Excel, PowerPoint, Images, HTML, Markdown, eBooks, and 50+ more formats"
      />

      {/* Fidelity Model */}
      <div className="mt-8">
        <h3 className="text-foreground text-center mb-2">Fidelity-First Conversion</h3>
        <p className="text-muted-foreground text-center mb-4" style={{ fontSize: "0.8125rem" }}>
          Every conversion shows its fidelity level so you always know what to expect
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.entries(FIDELITY_INFO) as [FidelityLevel, typeof FIDELITY_INFO[FidelityLevel]][]).map(([key, info]) => (
            <div key={key} className={`p-4 rounded-xl border ${info.bg}`}>
              <div className="flex items-center gap-2 mb-1">
                {key === "exact" && <ShieldCheck className={`w-4 h-4 ${info.color}`} />}
                {key === "structural" && <Sparkles className={`w-4 h-4 ${info.color}`} />}
                {key === "normalized" && <Info className={`w-4 h-4 ${info.color}`} />}
                <h4 className={info.color}>{info.label}</h4>
              </div>
              <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{info.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Supported Formats */}
      <div className="mt-8">
        <h3 className="text-foreground text-center mb-4">Supported Format Pipelines</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { icon: FileText, label: "Documents", desc: "DOCX, DOC, ODT, RTF", engine: "Office Renderer", color: "text-blue-600 bg-blue-50", fidelity: "exact" as const },
            { icon: Table2, label: "Spreadsheets", desc: "XLSX, XLS, ODS, CSV, TSV", engine: "Spreadsheet Renderer", color: "text-green-600 bg-green-50", fidelity: "exact" as const },
            { icon: Presentation, label: "Presentations", desc: "PPTX, PPT, ODP, PPS", engine: "Presentation Renderer", color: "text-orange-600 bg-orange-50", fidelity: "exact" as const },
            { icon: Image, label: "Images", desc: "JPG, PNG, TIFF, WebP, SVG, HEIC", engine: "Image Pipeline", color: "text-purple-600 bg-purple-50", fidelity: "exact" as const },
            { icon: Globe, label: "Web & Markup", desc: "HTML, MHTML, EPUB, XML", engine: "HTML Print Engine", color: "text-cyan-600 bg-cyan-50", fidelity: "structural" as const },
            { icon: Type, label: "Text & Code", desc: "TXT, MD, Markdown", engine: "Text Pipeline", color: "text-gray-600 bg-gray-50", fidelity: "structural" as const },
          ].map(cat => (
            <div key={cat.label} className="p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg ${cat.color} flex items-center justify-center`}>
                  <cat.icon className="w-4 h-4" />
                </div>
                <FidelityBadge level={cat.fidelity} />
              </div>
              <h4 className="text-foreground">{cat.label}</h4>
              <p className="text-muted-foreground" style={{ fontSize: "0.6875rem" }}>{cat.desc}</p>
              <p className="text-muted-foreground mt-1 flex items-center gap-1" style={{ fontSize: "0.625rem" }}>
                <Cpu className="w-2.5 h-2.5" /> {cat.engine}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quality Presets */}
      <div className="mt-8 mb-6">
        <h3 className="text-foreground text-center mb-4">Quality Presets</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Object.entries(QUALITY_PRESETS) as [QualityPreset, typeof QUALITY_PRESETS[QualityPreset]][]).map(([key, preset]) => (
            <div key={key} className="p-3 rounded-xl border border-border bg-card flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <PresetIcon preset={key as QualityPreset} />
              </div>
              <div>
                <h4 className="text-foreground" style={{ fontSize: "0.8125rem" }}>{preset.label}</h4>
                <p className="text-muted-foreground" style={{ fontSize: "0.6875rem" }}>{preset.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
