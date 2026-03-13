import React from "react";
import {
  FileText, Image, Table2, Presentation, BookOpen, File, X, RotateCw,
  GripVertical, ChevronDown, ChevronUp, Check, AlertCircle, Loader2,
  Copy, Trash2, MoreVertical, Eye
} from "lucide-react";
import { type FileItem, formatFileSize, getTypeColor } from "./store";

interface FileCardProps {
  file: FileItem;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRetry?: () => void;
  onPageSelect?: (pageId: string) => void;
  onPageRotate?: (pageId: string) => void;
  onPageDelete?: (pageId: string) => void;
  isDraggable?: boolean;
  dragHandleProps?: Record<string, any>;
  showActions?: boolean;
}

function getIcon(type: FileItem["type"]) {
  switch (type) {
    case "pdf": return <FileText className="w-5 h-5" />;
    case "document": return <FileText className="w-5 h-5" />;
    case "spreadsheet": return <Table2 className="w-5 h-5" />;
    case "presentation": return <Presentation className="w-5 h-5" />;
    case "image": return <Image className="w-5 h-5" />;
    case "ebook": return <BookOpen className="w-5 h-5" />;
    default: return <File className="w-5 h-5" />;
  }
}

function StatusBadge({ status, progress }: { status: FileItem["status"]; progress: number }) {
  switch (status) {
    case "pending":
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700" style={{ fontSize: "0.75rem" }}>
          <Loader2 className="w-3 h-3 animate-spin" /> Queued
        </span>
      );
    case "converting":
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700" style={{ fontSize: "0.75rem" }}>
          <Loader2 className="w-3 h-3 animate-spin" /> {progress}%
        </span>
      );
    case "ready":
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700" style={{ fontSize: "0.75rem" }}>
          <Check className="w-3 h-3" /> Ready
        </span>
      );
    case "error":
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700" style={{ fontSize: "0.75rem" }}>
          <AlertCircle className="w-3 h-3" /> Error
        </span>
      );
  }
}

export function FileCard({
  file, index, isExpanded, onToggleExpand, onRemove, onMoveUp, onMoveDown,
  onRetry, onPageSelect, onPageRotate, onPageDelete, isDraggable, dragHandleProps, showActions = true
}: FileCardProps) {
  const typeColorClass = getTypeColor(file.type);

  return (
    <div
      className={`group rounded-xl border bg-card transition-all duration-200 hover:shadow-md ${
        file.status === "error" ? "border-red-200 bg-red-50/30" : "border-border"
      }`}
    >
      <div className="flex items-center gap-3 p-3 md:p-4">
        {isDraggable && (
          <button
            className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
            aria-label="Drag to reorder"
            {...dragHandleProps}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}

        <div className={`flex-shrink-0 p-2 rounded-lg border ${typeColorClass}`}>
          {getIcon(file.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-foreground" title={file.name}>{file.name}</p>
            <span className={`flex-shrink-0 px-1.5 py-0.5 rounded border ${typeColorClass}`} style={{ fontSize: "0.625rem" }}>
              {file.extension.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-muted-foreground" style={{ fontSize: "0.75rem" }}>
            <span>{formatFileSize(file.size)}</span>
            {file.status === "ready" && <span>{file.pageCount} {file.pageCount === 1 ? "page" : "pages"}</span>}
            {file.dimensions && (
              <span className="hidden md:inline">{Math.round(file.dimensions.width)} x {Math.round(file.dimensions.height)} pt</span>
            )}
          </div>
          {file.error && (
            <p className="mt-1 text-red-600" style={{ fontSize: "0.75rem" }}>{file.error}</p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <StatusBadge status={file.status} progress={file.progress} />

          {file.status === "error" && onRetry && (
            <button
              onClick={onRetry}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Retry conversion"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          )}

          {showActions && (
            <>
              {onMoveUp && (
                <button
                  onClick={onMoveUp}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground hidden md:block"
                  aria-label="Move up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              )}
              {onMoveDown && (
                <button
                  onClick={onMoveDown}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground hidden md:block"
                  aria-label="Move down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}
            </>
          )}

          {file.status === "ready" && file.pageCount > 0 && (
            <button
              onClick={onToggleExpand}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label={isExpanded ? "Collapse pages" : "Expand pages"}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg hover:bg-red-100 transition-colors text-muted-foreground hover:text-red-600"
            aria-label="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conversion progress bar */}
      {file.status === "converting" && (
        <div className="px-4 pb-3">
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${file.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Expanded page thumbnails */}
      {isExpanded && file.status === "ready" && (
        <div className="border-t border-border px-4 py-3">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {file.pages.map((page, i) => (
              <button
                key={page.id}
                onClick={() => onPageSelect?.(page.id)}
                className={`relative flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all cursor-pointer hover:shadow-sm ${
                  page.selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/30"
                }`}
                aria-label={`Page ${i + 1}`}
              >
                <div
                  className="w-full bg-muted rounded flex items-center justify-center"
                  style={{
                    aspectRatio: `${page.width}/${page.height}`,
                    transform: `rotate(${page.rotation}deg)`,
                  }}
                >
                  <span className="text-muted-foreground" style={{ fontSize: "0.625rem" }}>{i + 1}</span>
                </div>
                <span style={{ fontSize: "0.625rem" }} className="text-muted-foreground">{i + 1}</span>
                {page.selected && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
          {onPageRotate && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
              <button
                onClick={() => file.pages.filter(p => p.selected).forEach(p => onPageRotate(p.id))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-accent transition-colors text-muted-foreground"
                style={{ fontSize: "0.75rem" }}
                disabled={!file.pages.some(p => p.selected)}
              >
                <RotateCw className="w-3 h-3" /> Rotate Selected
              </button>
              <button
                onClick={() => file.pages.filter(p => p.selected).forEach(p => onPageDelete?.(p.id))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-red-100 transition-colors text-muted-foreground hover:text-red-600"
                style={{ fontSize: "0.75rem" }}
                disabled={!file.pages.some(p => p.selected)}
              >
                <Trash2 className="w-3 h-3" /> Delete Selected
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
