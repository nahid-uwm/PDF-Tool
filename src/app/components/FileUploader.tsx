import React, { useCallback, useRef, useState } from "react";
import { Upload, FolderOpen, Clipboard, Link, Plus } from "lucide-react";
import { SUPPORTED_EXTENSIONS } from "./store";

interface FileUploaderProps {
  onFilesAdded: (files: File[]) => void;
  compact?: boolean;
  accept?: string;
  label?: string;
  sublabel?: string;
}

export function FileUploader({ onFilesAdded, compact = false, accept, label, sublabel }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFilesAdded(files);
  }, [onFilesAdded]);

  const handleClick = () => inputRef.current?.click();

  const handlePaste = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            const ext = type.split("/")[1] || "png";
            files.push(new File([blob], `pasted-image.${ext}`, { type }));
          }
        }
      }
      if (files.length > 0) onFilesAdded(files);
    } catch {
      // Clipboard access denied
    }
  }, [onFilesAdded]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) onFilesAdded(files);
    e.target.value = "";
  };

  const supportedExts = accept || SUPPORTED_EXTENSIONS.map(e => `.${e}`).join(",");

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleClick}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          aria-label="Add files"
        >
          <Plus className="w-4 h-4" />
          Add Files
        </button>
        <button
          onClick={handlePaste}
          className="flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent transition-colors"
          aria-label="Paste from clipboard"
        >
          <Clipboard className="w-4 h-4" />
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={supportedExts}
          onChange={handleFileInput}
          className="hidden"
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Upload files by clicking or dragging"
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleClick(); }}
      className={`
        relative flex flex-col items-center justify-center gap-4 p-8 md:p-12 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200
        ${isDragging
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-border hover:border-primary/50 hover:bg-muted/30"
        }
      `}
    >
      <div className={`p-4 rounded-2xl transition-colors ${isDragging ? "bg-primary/10" : "bg-muted"}`}>
        <Upload className={`w-8 h-8 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <div className="text-center">
        <p className="text-foreground mb-1">
          {label || "Drop files here or click to browse"}
        </p>
        <p className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>
          {sublabel || "PDF, Word, Excel, PowerPoint, Images, and 50+ formats supported"}
        </p>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={(e) => { e.stopPropagation(); handleClick(); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          <FolderOpen className="w-4 h-4" />
          Browse Files
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handlePaste(); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent transition-colors"
        >
          <Clipboard className="w-4 h-4" />
          Paste
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={supportedExts}
        onChange={handleFileInput}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}
