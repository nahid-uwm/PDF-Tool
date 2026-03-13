import { useState, useCallback, useRef } from "react";

export interface FileItem {
  id: string;
  file: File;
  name: string;
  extension: string;
  size: number;
  type: "pdf" | "document" | "spreadsheet" | "presentation" | "image" | "ebook" | "other";
  category: string;
  status: "pending" | "converting" | "ready" | "error";
  progress: number;
  pageCount: number;
  pages: PageItem[];
  error?: string;
  pdfData?: Uint8Array;
  thumbnailUrl?: string;
  lastModified: number;
  isEncrypted?: boolean;
  isSigned?: boolean;
  hasBookmarks?: boolean;
  hasOCR?: boolean;
  dimensions?: { width: number; height: number };
}

export interface PageItem {
  id: string;
  fileId: string;
  pageIndex: number;
  rotation: number;
  selected: boolean;
  thumbnailUrl?: string;
  width: number;
  height: number;
  isBlank?: boolean;
  label?: string;
}

export interface OutputSettings {
  pageNumbers: {
    enabled: boolean;
    format: "1" | "Page X of Y" | "roman" | "bates";
    position: "bottom-center" | "bottom-right" | "bottom-left" | "top-center" | "top-right" | "top-left";
    startFrom: number;
    skipFirst: boolean;
    fontSize: number;
    opacity: number;
    batesPrefix: string;
    batesDigits: number;
  };
  watermark: {
    enabled: boolean;
    text: string;
    opacity: number;
    rotation: number;
    fontSize: number;
    color: string;
    position: "center" | "diagonal" | "top" | "bottom";
    allPages: boolean;
  };
  headerFooter: {
    enabled: boolean;
    headerLeft: string;
    headerCenter: string;
    headerRight: string;
    footerLeft: string;
    footerCenter: string;
    footerRight: string;
  };
  toc: {
    enabled: boolean;
    title: string;
    position: "beginning" | "after-cover";
    clickable: boolean;
  };
  bookmarks: {
    enabled: boolean;
    source: "filenames" | "headings" | "existing" | "sheets" | "slides";
    strategy: "keep-all" | "flatten" | "nest-by-file" | "fresh";
  };
  metadata: {
    title: string;
    author: string;
    subject: string;
    keywords: string;
  };
  compression: "none" | "balanced" | "strong";
  outputFormat: "standard" | "web-optimized" | "pdf-a" | "print-ready" | "compressed";
  flatten: boolean;
  password: string;
}

export const FILE_TYPE_MAP: Record<string, { type: FileItem["type"]; category: string }> = {
  pdf: { type: "pdf", category: "PDF" },
  docx: { type: "document", category: "Word" },
  doc: { type: "document", category: "Word" },
  odt: { type: "document", category: "Document" },
  rtf: { type: "document", category: "Document" },
  txt: { type: "document", category: "Text" },
  md: { type: "document", category: "Markdown" },
  markdown: { type: "document", category: "Markdown" },
  html: { type: "document", category: "HTML" },
  htm: { type: "document", category: "HTML" },
  xlsx: { type: "spreadsheet", category: "Excel" },
  xls: { type: "spreadsheet", category: "Excel" },
  ods: { type: "spreadsheet", category: "Spreadsheet" },
  csv: { type: "spreadsheet", category: "CSV" },
  tsv: { type: "spreadsheet", category: "TSV" },
  pptx: { type: "presentation", category: "PowerPoint" },
  ppt: { type: "presentation", category: "PowerPoint" },
  odp: { type: "presentation", category: "Presentation" },
  pps: { type: "presentation", category: "PowerPoint" },
  ppsx: { type: "presentation", category: "PowerPoint" },
  jpg: { type: "image", category: "Image" },
  jpeg: { type: "image", category: "Image" },
  png: { type: "image", category: "Image" },
  gif: { type: "image", category: "Image" },
  bmp: { type: "image", category: "Image" },
  tif: { type: "image", category: "Image" },
  tiff: { type: "image", category: "Image" },
  webp: { type: "image", category: "Image" },
  svg: { type: "image", category: "SVG" },
  heic: { type: "image", category: "Image" },
  avif: { type: "image", category: "Image" },
  ico: { type: "image", category: "Image" },
  epub: { type: "ebook", category: "eBook" },
  xps: { type: "ebook", category: "XPS" },
  djvu: { type: "ebook", category: "DjVu" },
};

export const SUPPORTED_EXTENSIONS = Object.keys(FILE_TYPE_MAP);

export function getFileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() || "";
}

export function getFileTypeInfo(ext: string) {
  return FILE_TYPE_MAP[ext] || { type: "other" as const, category: "Unknown" };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export const defaultOutputSettings: OutputSettings = {
  pageNumbers: {
    enabled: false,
    format: "1",
    position: "bottom-center",
    startFrom: 1,
    skipFirst: false,
    fontSize: 10,
    opacity: 100,
    batesPrefix: "DOC-",
    batesDigits: 6,
  },
  watermark: {
    enabled: false,
    text: "CONFIDENTIAL",
    opacity: 15,
    rotation: -45,
    fontSize: 48,
    color: "#888888",
    position: "diagonal",
    allPages: true,
  },
  headerFooter: {
    enabled: false,
    headerLeft: "",
    headerCenter: "",
    headerRight: "",
    footerLeft: "",
    footerCenter: "",
    footerRight: "",
  },
  toc: {
    enabled: false,
    title: "Table of Contents",
    position: "beginning",
    clickable: true,
  },
  bookmarks: {
    enabled: true,
    source: "filenames",
    strategy: "nest-by-file",
  },
  metadata: {
    title: "",
    author: "",
    subject: "",
    keywords: "",
  },
  compression: "balanced",
  outputFormat: "standard",
  flatten: false,
  password: "",
};

export function getTypeColor(type: FileItem["type"]): string {
  switch (type) {
    case "pdf": return "bg-red-100 text-red-700 border-red-200";
    case "document": return "bg-blue-100 text-blue-700 border-blue-200";
    case "spreadsheet": return "bg-green-100 text-green-700 border-green-200";
    case "presentation": return "bg-orange-100 text-orange-700 border-orange-200";
    case "image": return "bg-purple-100 text-purple-700 border-purple-200";
    case "ebook": return "bg-teal-100 text-teal-700 border-teal-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export function getTypeIcon(type: FileItem["type"]): string {
  switch (type) {
    case "pdf": return "FileText";
    case "document": return "FileText";
    case "spreadsheet": return "Table";
    case "presentation": return "Presentation";
    case "image": return "Image";
    case "ebook": return "BookOpen";
    default: return "File";
  }
}
