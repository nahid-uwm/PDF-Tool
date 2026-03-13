import React, { useState, useCallback } from "react";
import {
  Download, Loader2, ArrowLeft, Scissors, FileText, Eye,
  ChevronDown, ChevronRight, Settings2, Trash2, AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router";
import { FileUploader } from "./FileUploader";
import {
  type FileItem, getFileExtension, getFileTypeInfo, generateId, formatFileSize
} from "./store";
import { loadPdfFile, splitPdf, downloadBlob, downloadZip } from "./pdf-utils";
import { motion, AnimatePresence } from "motion/react";

type SplitMode =
  | "each-page"
  | "every-n"
  | "custom-ranges"
  | "equal-parts"
  | "odd-pages"
  | "even-pages";

const SPLIT_MODES: { value: SplitMode; label: string; desc: string }[] = [
  { value: "each-page", label: "Each Page", desc: "Split every page into a separate PDF" },
  { value: "every-n", label: "Every N Pages", desc: "Split into groups of N pages" },
  { value: "custom-ranges", label: "Custom Ranges", desc: "Specify exact page ranges (e.g. 1-5, 8-12)" },
  { value: "equal-parts", label: "Equal Parts", desc: "Split into N equal-sized parts" },
  { value: "odd-pages", label: "Odd Pages", desc: "Extract only odd-numbered pages" },
  { value: "even-pages", label: "Even Pages", desc: "Extract only even-numbered pages" },
];

interface SplitResult {
  name: string;
  data: Uint8Array;
  pageCount: number;
}

export function SplitWorkspace() {
  const navigate = useNavigate();
  const [file, setFile] = useState<FileItem | null>(null);
  const [splitMode, setSplitMode] = useState<SplitMode>("each-page");
  const [everyN, setEveryN] = useState(5);
  const [customRanges, setCustomRanges] = useState("1-5, 6-10");
  const [equalParts, setEqualParts] = useState(2);
  const [results, setResults] = useState<SplitResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [namingTemplate, setNamingTemplate] = useState("{original_name}_part_{index}");
  const [showPreview, setShowPreview] = useState(false);

  const handleFilesAdded = useCallback(async (newFiles: File[]) => {
    const f = newFiles[0];
    if (!f) return;

    setIsUploading(true);
    setResults([]);

    const ext = getFileExtension(f.name);
    const typeInfo = getFileTypeInfo(ext);
    const id = generateId();

    try {
      const result = await loadPdfFile(f);
      setFile({
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
        dimensions: result.pages.length > 0 ? { width: result.pages[0].width, height: result.pages[0].height } : undefined,
      });
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
  }, []);

  const handleSplit = useCallback(async () => {
    if (!file?.pdfData) return;

    setIsProcessing(true);
    setResults([]);

    try {
      const splitResults = await splitPdf(file.pdfData, splitMode, {
        ranges: customRanges,
        everyN,
        parts: equalParts,
      });

      // Apply naming template
      const baseName = file.name.replace(/\.pdf$/i, "");
      const named = splitResults.map((r, i) => ({
        ...r,
        name: namingTemplate
          .replace("{original_name}", baseName)
          .replace("{index}", String(i + 1))
          .replace("{range}", `${r.name.match(/pages_(\d+-\d+)/)?.[1] || i + 1}`)
          .replace("{page_start}", r.name.match(/pages_(\d+)/)?.[1] || "1")
          .replace("{page_end}", r.name.match(/pages_\d+-(\d+)/)?.[1] || "1")
          + ".pdf",
      }));

      setResults(named);
      setShowPreview(true);
    } catch (error) {
      console.error("Split failed:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [file, splitMode, customRanges, everyN, equalParts, namingTemplate]);

  const handleDownloadAll = useCallback(async () => {
    if (results.length === 1) {
      downloadBlob(results[0].data, results[0].name);
    } else {
      await downloadZip(results);
    }
  }, [results]);

  const handleDownloadOne = useCallback((result: SplitResult) => {
    downloadBlob(result.data, result.name);
  }, []);

  return (
    <div className="min-h-full flex flex-col">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-foreground mr-auto">Split PDF</h2>
          {file && (
            <button
              onClick={() => { setFile(null); setResults([]); }}
              className="p-2 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors text-muted-foreground"
              aria-label="Clear"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-5xl mx-auto px-4 py-6 w-full">
        {!file ? (
          <div className="max-w-2xl mx-auto mt-8">
            <FileUploader
              onFilesAdded={handleFilesAdded}
              label="Drop a PDF to split"
              sublabel="Upload a PDF file to split into multiple documents"
              accept=".pdf"
            />
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { title: "10+ Split Modes", desc: "Split by pages, ranges, bookmarks, or equal parts" },
                { title: "Visual Preview", desc: "Preview resulting files before downloading" },
                { title: "Custom Naming", desc: "Use templates to name output files" },
              ].map(item => (
                <div key={item.title} className="flex flex-col items-center text-center p-5 rounded-xl border border-border bg-card">
                  <Scissors className="w-5 h-5 text-muted-foreground mb-2" />
                  <h4 className="text-foreground mb-1">{item.title}</h4>
                  <p style={{ fontSize: "0.75rem" }} className="text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* File Info */}
            <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
              <div className="p-3 rounded-xl bg-red-50">
                <FileText className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-foreground">{file.name}</p>
                <p className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>
                  {file.pageCount} pages &middot; {formatFileSize(file.size)}
                </p>
              </div>
              {file.status === "error" && (
                <div className="flex items-center gap-2 text-red-600" style={{ fontSize: "0.875rem" }}>
                  <AlertCircle className="w-4 h-4" /> {file.error}
                </div>
              )}
            </div>

            {/* Page Thumbnails */}
            {file.status === "ready" && (
              <div className="p-4 rounded-xl border border-border bg-card">
                <h3 className="text-foreground mb-3">Pages</h3>
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                  {file.pages.map((page, i) => (
                    <div
                      key={page.id}
                      className="flex flex-col items-center gap-1 p-1.5 rounded-lg border border-border hover:border-primary/30 transition-colors"
                    >
                      <div
                        className="w-full bg-muted rounded flex items-center justify-center"
                        style={{ aspectRatio: `${page.width}/${page.height}` }}
                      >
                        <span className="text-muted-foreground" style={{ fontSize: "0.625rem" }}>{i + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Split Options */}
            {file.status === "ready" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-foreground">Split Mode</h3>
                  <div className="space-y-2">
                    {SPLIT_MODES.map(mode => (
                      <button
                        key={mode.value}
                        onClick={() => setSplitMode(mode.value)}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                          splitMode === mode.value
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          splitMode === mode.value ? "border-primary" : "border-muted-foreground"
                        }`}>
                          {splitMode === mode.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <div>
                          <p className="text-foreground">{mode.label}</p>
                          <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{mode.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-foreground">Options</h3>

                  {splitMode === "every-n" && (
                    <div className="space-y-2">
                      <label className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>Pages per split</label>
                      <input
                        type="number"
                        min={1}
                        max={file.pageCount}
                        value={everyN}
                        onChange={(e) => setEveryN(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-foreground"
                      />
                      <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                        Will create ~{Math.ceil(file.pageCount / everyN)} files
                      </p>
                    </div>
                  )}

                  {splitMode === "custom-ranges" && (
                    <div className="space-y-2">
                      <label className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>Page ranges</label>
                      <input
                        type="text"
                        value={customRanges}
                        onChange={(e) => setCustomRanges(e.target.value)}
                        placeholder="1-5, 6-10, 11-end"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-foreground"
                      />
                      <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                        Use commas to separate ranges. Use "end" for the last page.
                      </p>
                    </div>
                  )}

                  {splitMode === "equal-parts" && (
                    <div className="space-y-2">
                      <label className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>Number of parts</label>
                      <input
                        type="number"
                        min={2}
                        max={file.pageCount}
                        value={equalParts}
                        onChange={(e) => setEqualParts(parseInt(e.target.value) || 2)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-foreground"
                      />
                      <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                        ~{Math.ceil(file.pageCount / equalParts)} pages per part
                      </p>
                    </div>
                  )}

                  <div className="space-y-2 pt-4 border-t border-border">
                    <label className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>Naming template</label>
                    <input
                      type="text"
                      value={namingTemplate}
                      onChange={(e) => setNamingTemplate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-foreground"
                    />
                    <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                      Tokens: {"{original_name}"}, {"{index}"}, {"{range}"}, {"{page_start}"}, {"{page_end}"}
                    </p>
                  </div>

                  <button
                    onClick={handleSplit}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-40 transition-all mt-4"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Scissors className="w-4 h-4" />
                    )}
                    {isProcessing ? "Splitting..." : "Split PDF"}
                  </button>
                </div>
              </div>
            )}

            {/* Results Preview */}
            {results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-foreground">
                    Split Results ({results.length} {results.length === 1 ? "file" : "files"})
                  </h3>
                  <button
                    onClick={handleDownloadAll}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <Download className="w-4 h-4" />
                    Download All
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {results.map((result, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow">
                      <div className="p-2 rounded-lg bg-red-50">
                        <FileText className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-foreground" style={{ fontSize: "0.875rem" }}>{result.name}</p>
                        <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                          {result.pageCount} {result.pageCount === 1 ? "page" : "pages"} &middot; {formatFileSize(result.data.length)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownloadOne(result)}
                        className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        aria-label={`Download ${result.name}`}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
