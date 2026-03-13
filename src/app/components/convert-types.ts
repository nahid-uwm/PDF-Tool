/**
 * Convert-to-PDF types and constants for the high-fidelity conversion pipeline.
 */

// ─── Fidelity Levels ─────────────────────────────────────────────────
export type FidelityLevel = "exact" | "structural" | "normalized";

export const FIDELITY_INFO: Record<FidelityLevel, { label: string; description: string; color: string; bg: string }> = {
  exact: {
    label: "Exact Visual Match",
    description: "Page appearance matches the source as closely as possible",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
  },
  structural: {
    label: "Structural Match",
    description: "Sections, headings, tables, and images preserved; minor visual differences possible",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  normalized: {
    label: "Normalized Output",
    description: "Readable content preserved with safe fallback rendering",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
  },
};

// ─── Conversion Status ───────────────────────────────────────────────
export type ConvertStatus = "queued" | "analyzing" | "converting" | "ocr" | "warning" | "done" | "failed";

export const STATUS_INFO: Record<ConvertStatus, { label: string; color: string; bg: string }> = {
  queued: { label: "Queued", color: "text-gray-600", bg: "bg-gray-100" },
  analyzing: { label: "Analyzing", color: "text-indigo-600", bg: "bg-indigo-50" },
  converting: { label: "Converting", color: "text-blue-600", bg: "bg-blue-50" },
  ocr: { label: "OCR Processing", color: "text-purple-600", bg: "bg-purple-50" },
  warning: { label: "Done with Warnings", color: "text-amber-600", bg: "bg-amber-50" },
  done: { label: "Done", color: "text-emerald-600", bg: "bg-emerald-50" },
  failed: { label: "Failed", color: "text-red-600", bg: "bg-red-50" },
};

// ─── Conversion Engine ───────────────────────────────────────────────
export type ConversionEngine =
  | "office-renderer"
  | "presentation-renderer"
  | "spreadsheet-renderer"
  | "text-pipeline"
  | "markdown-pipeline"
  | "html-print-engine"
  | "image-pipeline"
  | "epub-renderer"
  | "email-renderer"
  | "pdf-passthrough"
  | "generic-fallback";

export const ENGINE_INFO: Record<ConversionEngine, { label: string; description: string }> = {
  "office-renderer": { label: "Office Renderer", description: "High-fidelity document rendering engine" },
  "presentation-renderer": { label: "Presentation Renderer", description: "Slide-aware rendering with theme preservation" },
  "spreadsheet-renderer": { label: "Spreadsheet Renderer", description: "Print-aware grid rendering with sheet layout" },
  "text-pipeline": { label: "Text Pipeline", description: "Clean text-to-PDF with typography controls" },
  "markdown-pipeline": { label: "Markdown Pipeline", description: "Structured markdown rendering with bookmarks" },
  "html-print-engine": { label: "HTML Print Engine", description: "Browser-grade print CSS rendering" },
  "image-pipeline": { label: "Image Pipeline", description: "Image-to-PDF with orientation and fit controls" },
  "epub-renderer": { label: "eBook Renderer", description: "Chapter-aware EPUB conversion" },
  "email-renderer": { label: "Email Renderer", description: "Message header and body rendering" },
  "pdf-passthrough": { label: "PDF Passthrough", description: "No conversion needed; optimization only" },
  "generic-fallback": { label: "Generic Fallback", description: "Best-effort content extraction" },
};

// ─── Quality Presets ─────────────────────────────────────────────────
export type QualityPreset = "maximum" | "balanced" | "compact" | "archival" | "searchable-scan";

export const QUALITY_PRESETS: Record<QualityPreset, { label: string; description: string; icon: string }> = {
  maximum: {
    label: "Maximum Fidelity",
    description: "Original quality, no compression. Best for presentations and print.",
    icon: "crown",
  },
  balanced: {
    label: "Balanced",
    description: "Maintain appearance with moderate optimization. Default preset.",
    icon: "scale",
  },
  compact: {
    label: "Compact",
    description: "Compressed images, reduced file size. Prioritize readability.",
    icon: "minimize",
  },
  archival: {
    label: "Archival (PDF/A)",
    description: "PDF/A-compatible output for long-term preservation.",
    icon: "archive",
  },
  "searchable-scan": {
    label: "Searchable Scan",
    description: "OCR enabled, cleanup on. Optimized for scanned documents.",
    icon: "scan",
  },
};

// ─── Per-File Conversion Options ─────────────────────────────────────
export interface PresentationOptions {
  includeHiddenSlides: boolean;
  includeNotes: boolean;
  handoutLayout: 1 | 2 | 3 | 4 | 6 | 9;
  bookmarksFromTitles: boolean;
  sectionBookmarks: boolean;
  slideNumbers: "preserve" | "pdf" | "both" | "none";
  rasterFallbackDpi: 150 | 300 | 600;
  keepSlideSize: boolean;
  fitToPaper: boolean;
  grayscale: boolean;
}

export interface DocumentOptions {
  includeComments: boolean;
  includeTrackedChanges: boolean;
  bookmarksFromHeadings: boolean;
  generateToc: boolean;
  preserveHyperlinks: boolean;
  taggedPdf: boolean;
  pdfA: boolean;
  imageDownsampling: boolean;
  marginNormalization: boolean;
}

export interface SpreadsheetOptions {
  exportMode: "combined" | "per-sheet" | "selected";
  selectedSheets: number[];
  includeHiddenSheets: boolean;
  scalingMode: "none" | "fit-page" | "fit-columns" | "fit-rows" | "print-settings";
  smartLandscape: boolean;
  repeatHeaders: boolean;
  csvDelimiter: "," | ";" | "\t" | "|";
  csvEncoding: "utf-8" | "ascii" | "latin1";
  csvHasHeaders: boolean;
}

export interface ImageOptions {
  fitMode: "fit-within" | "fill-page" | "center-actual" | "crop-bleed";
  backgroundColor: string;
  multiPerPage: boolean;
  contactSheet: boolean;
  ocrEnabled: boolean;
  scanCleanup: {
    deskew: boolean;
    denoise: boolean;
    backgroundWhitening: boolean;
    borderCrop: boolean;
    contrastBoost: boolean;
  };
}

export interface HtmlOptions {
  printCss: boolean;
  includeBackgrounds: boolean;
  customHeaderFooter: boolean;
  pageNumbers: boolean;
  readerCleanup: boolean;
}

export interface TextOptions {
  mode: "wrapped" | "fixed-width" | "preserve-whitespace";
  fontFamily: "serif" | "sans-serif" | "monospace";
  generateToc: boolean;
  titlePage: boolean;
  syntaxHighlight: boolean;
}

export interface ConvertFileOptions {
  preset: QualityPreset;
  pageSize: "auto" | "letter" | "a4" | "legal" | "custom";
  orientation: "auto" | "portrait" | "landscape";
  margins: { top: number; right: number; bottom: number; left: number };
  ocrEnabled: boolean;
  bookmarksEnabled: boolean;
  tocEnabled: boolean;
  passwordProtect: string;
  pdfA: boolean;
  imageCompression: "none" | "low" | "medium" | "high";
  fontHandling: "auto" | "substitute" | "strict";
  presentation: PresentationOptions;
  document: DocumentOptions;
  spreadsheet: SpreadsheetOptions;
  image: ImageOptions;
  html: HtmlOptions;
  text: TextOptions;
}

// ─── Conversion Report ───────────────────────────────────────────────
export interface ConversionWarning {
  type: "font" | "image" | "effect" | "layout" | "content" | "fallback";
  severity: "info" | "warning" | "error";
  message: string;
  detail?: string;
  page?: number;
}

export interface ConversionReport {
  sourceType: string;
  sourceSize: number;
  engine: ConversionEngine;
  fidelity: FidelityLevel;
  outputPageCount: number;
  outputSize: number;
  detectedFonts: string[];
  substitutedFonts: { original: string; replacement: string }[];
  embeddedImagesCount: number;
  unsupportedElements: string[];
  rasterizedElements: string[];
  ocrStatus: "none" | "applied" | "partial" | "failed";
  ocrLanguages: string[];
  ocrConfidence: number;
  warnings: ConversionWarning[];
  conversionTime: number;
  timestamp: number;
}

// ─── Convert File Item (extends base FileItem) ───────────────────────
export interface ConvertFileItem {
  id: string;
  file: File;
  name: string;
  extension: string;
  size: number;
  type: "pdf" | "document" | "spreadsheet" | "presentation" | "image" | "ebook" | "other";
  category: string;
  status: ConvertStatus;
  progress: number;
  pageCount: number;
  pdfData?: Uint8Array;
  error?: string;
  errorDetail?: string;
  engine: ConversionEngine;
  fidelity: FidelityLevel;
  options: ConvertFileOptions;
  report?: ConversionReport;
  lastModified: number;
  dimensions?: { width: number; height: number };
}

// ─── Defaults ────────────────────────────────────────────────────────
export const defaultPresentationOptions: PresentationOptions = {
  includeHiddenSlides: false,
  includeNotes: false,
  handoutLayout: 1,
  bookmarksFromTitles: true,
  sectionBookmarks: true,
  slideNumbers: "preserve",
  rasterFallbackDpi: 300,
  keepSlideSize: true,
  fitToPaper: false,
  grayscale: false,
};

export const defaultDocumentOptions: DocumentOptions = {
  includeComments: false,
  includeTrackedChanges: false,
  bookmarksFromHeadings: true,
  generateToc: false,
  preserveHyperlinks: true,
  taggedPdf: false,
  pdfA: false,
  imageDownsampling: false,
  marginNormalization: false,
};

export const defaultSpreadsheetOptions: SpreadsheetOptions = {
  exportMode: "combined",
  selectedSheets: [],
  includeHiddenSheets: false,
  scalingMode: "print-settings",
  smartLandscape: false,
  repeatHeaders: true,
  csvDelimiter: ",",
  csvEncoding: "utf-8",
  csvHasHeaders: true,
};

export const defaultImageOptions: ImageOptions = {
  fitMode: "fit-within",
  backgroundColor: "#ffffff",
  multiPerPage: false,
  contactSheet: false,
  ocrEnabled: false,
  scanCleanup: {
    deskew: false,
    denoise: false,
    backgroundWhitening: false,
    borderCrop: false,
    contrastBoost: false,
  },
};

export const defaultHtmlOptions: HtmlOptions = {
  printCss: true,
  includeBackgrounds: false,
  customHeaderFooter: false,
  pageNumbers: false,
  readerCleanup: false,
};

export const defaultTextOptions: TextOptions = {
  mode: "wrapped",
  fontFamily: "sans-serif",
  generateToc: true,
  titlePage: false,
  syntaxHighlight: false,
};

export function createDefaultOptions(preset: QualityPreset = "balanced"): ConvertFileOptions {
  return {
    preset,
    pageSize: "auto",
    orientation: "auto",
    margins: { top: 36, right: 36, bottom: 36, left: 36 },
    ocrEnabled: preset === "searchable-scan",
    bookmarksEnabled: true,
    tocEnabled: false,
    passwordProtect: "",
    pdfA: preset === "archival",
    imageCompression: preset === "compact" ? "high" : preset === "maximum" ? "none" : "medium",
    fontHandling: "auto",
    presentation: { ...defaultPresentationOptions },
    document: { ...defaultDocumentOptions },
    spreadsheet: { ...defaultSpreadsheetOptions },
    image: { ...defaultImageOptions },
    html: { ...defaultHtmlOptions },
    text: { ...defaultTextOptions },
  };
}

// ─── Engine Routing ──────────────────────────────────────────────────
export function getConversionEngine(ext: string): ConversionEngine {
  switch (ext) {
    case "docx": case "doc": case "odt": case "rtf":
      return "office-renderer";
    case "pptx": case "ppt": case "odp": case "pps": case "ppsx":
      return "presentation-renderer";
    case "xlsx": case "xls": case "ods": case "csv": case "tsv":
      return "spreadsheet-renderer";
    case "txt":
      return "text-pipeline";
    case "md": case "markdown":
      return "markdown-pipeline";
    case "html": case "htm": case "mht": case "mhtml": case "xml":
      return "html-print-engine";
    case "jpg": case "jpeg": case "png": case "gif": case "bmp":
    case "tif": case "tiff": case "webp": case "svg": case "heic":
    case "avif": case "ico":
      return "image-pipeline";
    case "epub":
      return "epub-renderer";
    case "eml": case "msg": case "mbox":
      return "email-renderer";
    case "pdf":
      return "pdf-passthrough";
    default:
      return "generic-fallback";
  }
}

export function getExpectedFidelity(ext: string): FidelityLevel {
  switch (ext) {
    // Exact visual match targets
    case "pptx": case "docx": case "xlsx":
    case "jpg": case "jpeg": case "png": case "gif": case "bmp":
    case "tif": case "tiff": case "webp": case "svg":
    case "pdf":
      return "exact";
    // Structural match targets
    case "odt": case "odp": case "ods":
    case "html": case "htm": case "mht": case "mhtml":
    case "md": case "markdown":
    case "rtf":
    case "csv": case "tsv":
    case "epub":
      return "structural";
    // Normalized output for legacy/unsupported
    case "doc": case "ppt": case "xls":
    case "pps": case "ppsx":
    default:
      return "normalized";
  }
}
