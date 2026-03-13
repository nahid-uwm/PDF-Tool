import React, { useState } from "react";
import {
  ChevronDown, ChevronRight, Settings2, Presentation, FileText,
  Table2, Image, Globe, Type, Lock, BookMarked, List, Scan, Monitor
} from "lucide-react";
import type { ConvertFileOptions, ConvertFileItem } from "./convert-types";

interface ConvertOptionsPanelProps {
  file: ConvertFileItem;
  options: ConvertFileOptions;
  onChange: (opts: ConvertFileOptions) => void;
}

function Section({ title, icon, children, defaultOpen = false }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors"
        aria-expanded={open}
      >
        {icon}
        <span className="flex-1 text-left text-foreground" style={{ fontSize: "0.8125rem" }}>{title}</span>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      {open && <div className="px-3 pb-3 space-y-2.5 border-t border-border pt-2.5">{children}</div>}
    </div>
  );
}

function Toggle({ label, checked, onChange, description }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; description?: string;
}) {
  return (
    <label className="flex items-start justify-between gap-2 cursor-pointer">
      <div className="flex-1">
        <span style={{ fontSize: "0.8125rem" }} className="text-foreground">{label}</span>
        {description && <p style={{ fontSize: "0.6875rem" }} className="text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-8 h-[18px] rounded-full transition-colors flex-shrink-0 mt-0.5 ${checked ? "bg-primary" : "bg-switch-background"}`}
      >
        <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform shadow-sm ${checked ? "translate-x-3.5" : ""}`} />
      </button>
    </label>
  );
}

function SelectField({ label, value, onChange, options, description }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; description?: string;
}) {
  return (
    <div>
      <label className="text-foreground block" style={{ fontSize: "0.8125rem" }}>{label}</label>
      {description && <p style={{ fontSize: "0.6875rem" }} className="text-muted-foreground mt-0.5">{description}</p>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-border bg-input-background text-foreground"
        style={{ fontSize: "0.8125rem" }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function ConvertOptionsPanel({ file, options, onChange }: ConvertOptionsPanelProps) {
  const update = (partial: Partial<ConvertFileOptions>) => onChange({ ...options, ...partial });
  const updatePres = (partial: Partial<ConvertFileOptions["presentation"]>) =>
    update({ presentation: { ...options.presentation, ...partial } });
  const updateDoc = (partial: Partial<ConvertFileOptions["document"]>) =>
    update({ document: { ...options.document, ...partial } });
  const updateSheet = (partial: Partial<ConvertFileOptions["spreadsheet"]>) =>
    update({ spreadsheet: { ...options.spreadsheet, ...partial } });
  const updateImg = (partial: Partial<ConvertFileOptions["image"]>) =>
    update({ image: { ...options.image, ...partial } });
  const updateHtml = (partial: Partial<ConvertFileOptions["html"]>) =>
    update({ html: { ...options.html, ...partial } });
  const updateText = (partial: Partial<ConvertFileOptions["text"]>) =>
    update({ text: { ...options.text, ...partial } });

  const isPresentation = ["pptx", "ppt", "odp", "pps", "ppsx"].includes(file.extension);
  const isDocument = ["docx", "doc", "odt", "rtf"].includes(file.extension);
  const isSpreadsheet = ["xlsx", "xls", "ods", "csv", "tsv"].includes(file.extension);
  const isImage = ["jpg", "jpeg", "png", "gif", "bmp", "tif", "tiff", "webp", "svg", "heic", "avif", "ico"].includes(file.extension);
  const isHtml = ["html", "htm", "mht", "mhtml", "xml"].includes(file.extension);
  const isText = ["txt", "md", "markdown"].includes(file.extension);
  const isCsv = ["csv", "tsv"].includes(file.extension);

  return (
    <div className="space-y-2">
      {/* General Settings */}
      <Section title="Page Layout" icon={<Settings2 className="w-3.5 h-3.5 text-muted-foreground" />} defaultOpen>
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="Page Size"
            value={options.pageSize}
            onChange={v => update({ pageSize: v as any })}
            options={[
              { value: "auto", label: "Auto (match source)" },
              { value: "letter", label: "Letter (8.5 x 11)" },
              { value: "a4", label: "A4 (210 x 297mm)" },
              { value: "legal", label: "Legal (8.5 x 14)" },
            ]}
          />
          <SelectField
            label="Orientation"
            value={options.orientation}
            onChange={v => update({ orientation: v as any })}
            options={[
              { value: "auto", label: "Auto" },
              { value: "portrait", label: "Portrait" },
              { value: "landscape", label: "Landscape" },
            ]}
          />
        </div>
        <SelectField
          label="Image Compression"
          value={options.imageCompression}
          onChange={v => update({ imageCompression: v as any })}
          options={[
            { value: "none", label: "None (maximum quality)" },
            { value: "low", label: "Low compression" },
            { value: "medium", label: "Medium compression" },
            { value: "high", label: "High compression (smaller file)" },
          ]}
        />
        <SelectField
          label="Font Handling"
          value={options.fontHandling}
          onChange={v => update({ fontHandling: v as any })}
          options={[
            { value: "auto", label: "Auto (best available substitute)" },
            { value: "substitute", label: "Always substitute with system fonts" },
            { value: "strict", label: "Strict (warn on missing fonts)" },
          ]}
        />
      </Section>

      {/* Navigation & Structure */}
      <Section title="Navigation & Structure" icon={<BookMarked className="w-3.5 h-3.5 text-muted-foreground" />}>
        <Toggle
          label="Generate bookmarks"
          checked={options.bookmarksEnabled}
          onChange={v => update({ bookmarksEnabled: v })}
          description="Auto-create from headings, slides, or sheet names"
        />
        <Toggle
          label="Generate table of contents"
          checked={options.tocEnabled}
          onChange={v => update({ tocEnabled: v })}
          description="Add a clickable TOC page at the beginning"
        />
      </Section>

      {/* Security */}
      <Section title="Security" icon={<Lock className="w-3.5 h-3.5 text-muted-foreground" />}>
        <div>
          <label className="text-foreground block" style={{ fontSize: "0.8125rem" }}>Password Protection</label>
          <input
            type="password"
            value={options.passwordProtect}
            onChange={e => update({ passwordProtect: e.target.value })}
            placeholder="Leave empty for no password"
            className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-border bg-input-background text-foreground"
            style={{ fontSize: "0.8125rem" }}
          />
        </div>
        <Toggle
          label="PDF/A archival mode"
          checked={options.pdfA}
          onChange={v => update({ pdfA: v })}
          description="Produce PDF/A-compatible output for long-term preservation"
        />
      </Section>

      {/* Presentation-specific */}
      {isPresentation && (
        <Section title="Presentation Options" icon={<Presentation className="w-3.5 h-3.5 text-orange-500" />} defaultOpen>
          <Toggle
            label="Include hidden slides"
            checked={options.presentation.includeHiddenSlides}
            onChange={v => updatePres({ includeHiddenSlides: v })}
          />
          <Toggle
            label="Include speaker notes"
            checked={options.presentation.includeNotes}
            onChange={v => updatePres({ includeNotes: v })}
            description="Append notes below each slide"
          />
          <SelectField
            label="Handout Layout"
            value={String(options.presentation.handoutLayout)}
            onChange={v => updatePres({ handoutLayout: parseInt(v) as any })}
            options={[
              { value: "1", label: "1 slide per page (default)" },
              { value: "2", label: "2 slides per page" },
              { value: "3", label: "3 slides per page" },
              { value: "4", label: "4 slides per page" },
              { value: "6", label: "6 slides per page" },
              { value: "9", label: "9 slides per page" },
            ]}
          />
          <Toggle
            label="Bookmarks from slide titles"
            checked={options.presentation.bookmarksFromTitles}
            onChange={v => updatePres({ bookmarksFromTitles: v })}
          />
          <Toggle
            label="Section bookmarks"
            checked={options.presentation.sectionBookmarks}
            onChange={v => updatePres({ sectionBookmarks: v })}
          />
          <SelectField
            label="Slide Numbers"
            value={options.presentation.slideNumbers}
            onChange={v => updatePres({ slideNumbers: v as any })}
            options={[
              { value: "preserve", label: "Preserve source numbering" },
              { value: "pdf", label: "Add PDF page numbers" },
              { value: "both", label: "Both" },
              { value: "none", label: "None" },
            ]}
          />
          <SelectField
            label="Raster Fallback DPI"
            value={String(options.presentation.rasterFallbackDpi)}
            onChange={v => updatePres({ rasterFallbackDpi: parseInt(v) as any })}
            description="Resolution for elements that can't be preserved as vector"
            options={[
              { value: "150", label: "150 DPI (faster)" },
              { value: "300", label: "300 DPI (recommended)" },
              { value: "600", label: "600 DPI (print quality)" },
            ]}
          />
          <Toggle
            label="Keep exact slide size"
            checked={options.presentation.keepSlideSize}
            onChange={v => updatePres({ keepSlideSize: v })}
          />
          <Toggle
            label="Fit to paper"
            checked={options.presentation.fitToPaper}
            onChange={v => updatePres({ fitToPaper: v })}
          />
          <Toggle
            label="Grayscale output"
            checked={options.presentation.grayscale}
            onChange={v => updatePres({ grayscale: v })}
          />
        </Section>
      )}

      {/* Document-specific */}
      {isDocument && (
        <Section title="Document Options" icon={<FileText className="w-3.5 h-3.5 text-blue-500" />} defaultOpen>
          <Toggle
            label="Include comments"
            checked={options.document.includeComments}
            onChange={v => updateDoc({ includeComments: v })}
          />
          <Toggle
            label="Include tracked changes"
            checked={options.document.includeTrackedChanges}
            onChange={v => updateDoc({ includeTrackedChanges: v })}
          />
          <Toggle
            label="Bookmarks from headings"
            checked={options.document.bookmarksFromHeadings}
            onChange={v => updateDoc({ bookmarksFromHeadings: v })}
          />
          <Toggle
            label="Generate clickable TOC"
            checked={options.document.generateToc}
            onChange={v => updateDoc({ generateToc: v })}
          />
          <Toggle
            label="Preserve hyperlinks"
            checked={options.document.preserveHyperlinks}
            onChange={v => updateDoc({ preserveHyperlinks: v })}
          />
          <Toggle
            label="Tagged PDF / Accessibility"
            checked={options.document.taggedPdf}
            onChange={v => updateDoc({ taggedPdf: v })}
            description="Produce accessible PDF with document structure tags"
          />
          <Toggle
            label="Image downsampling"
            checked={options.document.imageDownsampling}
            onChange={v => updateDoc({ imageDownsampling: v })}
            description="Reduce resolution of large images to decrease file size"
          />
          <Toggle
            label="Margin normalization"
            checked={options.document.marginNormalization}
            onChange={v => updateDoc({ marginNormalization: v })}
            description="Normalize margins across all pages"
          />
        </Section>
      )}

      {/* Spreadsheet-specific */}
      {isSpreadsheet && (
        <Section title="Spreadsheet Options" icon={<Table2 className="w-3.5 h-3.5 text-green-500" />} defaultOpen>
          <SelectField
            label="Export Mode"
            value={options.spreadsheet.exportMode}
            onChange={v => updateSheet({ exportMode: v as any })}
            options={[
              { value: "combined", label: "One combined PDF" },
              { value: "per-sheet", label: "One PDF per sheet" },
              { value: "selected", label: "Selected sheets only" },
            ]}
          />
          <SelectField
            label="Scaling Mode"
            value={options.spreadsheet.scalingMode}
            onChange={v => updateSheet({ scalingMode: v as any })}
            options={[
              { value: "print-settings", label: "Preserve print settings" },
              { value: "none", label: "No scaling" },
              { value: "fit-page", label: "Fit sheet to one page" },
              { value: "fit-columns", label: "Fit all columns to page" },
              { value: "fit-rows", label: "Fit rows to page height" },
            ]}
          />
          <Toggle
            label="Include hidden sheets"
            checked={options.spreadsheet.includeHiddenSheets}
            onChange={v => updateSheet({ includeHiddenSheets: v })}
          />
          <Toggle
            label="Smart landscape"
            checked={options.spreadsheet.smartLandscape}
            onChange={v => updateSheet({ smartLandscape: v })}
            description="Auto-switch wide sheets to landscape orientation"
          />
          <Toggle
            label="Repeat header rows"
            checked={options.spreadsheet.repeatHeaders}
            onChange={v => updateSheet({ repeatHeaders: v })}
          />
          {isCsv && (
            <>
              <SelectField
                label="Delimiter"
                value={options.spreadsheet.csvDelimiter}
                onChange={v => updateSheet({ csvDelimiter: v as any })}
                options={[
                  { value: ",", label: "Comma (,)" },
                  { value: ";", label: "Semicolon (;)" },
                  { value: "\t", label: "Tab" },
                  { value: "|", label: "Pipe (|)" },
                ]}
              />
              <SelectField
                label="Encoding"
                value={options.spreadsheet.csvEncoding}
                onChange={v => updateSheet({ csvEncoding: v as any })}
                options={[
                  { value: "utf-8", label: "UTF-8" },
                  { value: "ascii", label: "ASCII" },
                  { value: "latin1", label: "Latin-1" },
                ]}
              />
              <Toggle
                label="First row is header"
                checked={options.spreadsheet.csvHasHeaders}
                onChange={v => updateSheet({ csvHasHeaders: v })}
              />
            </>
          )}
        </Section>
      )}

      {/* Image-specific */}
      {isImage && (
        <Section title="Image Options" icon={<Image className="w-3.5 h-3.5 text-purple-500" />} defaultOpen>
          <SelectField
            label="Fit Mode"
            value={options.image.fitMode}
            onChange={v => updateImg({ fitMode: v as any })}
            options={[
              { value: "fit-within", label: "Fit within page" },
              { value: "fill-page", label: "Fill page" },
              { value: "center-actual", label: "Center at actual size" },
              { value: "crop-bleed", label: "Crop to bleed" },
            ]}
          />
          <div>
            <label className="text-foreground block" style={{ fontSize: "0.8125rem" }}>Background Color</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={options.image.backgroundColor}
                onChange={e => updateImg({ backgroundColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border border-border"
              />
              <input
                type="text"
                value={options.image.backgroundColor}
                onChange={e => updateImg({ backgroundColor: e.target.value })}
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-border bg-input-background text-foreground"
                style={{ fontSize: "0.8125rem" }}
              />
            </div>
          </div>
          <Toggle
            label="Contact sheet mode"
            checked={options.image.contactSheet}
            onChange={v => updateImg({ contactSheet: v })}
            description="Arrange multiple images per page in a grid"
          />
          <Toggle
            label="OCR (searchable text)"
            checked={options.image.ocrEnabled}
            onChange={v => updateImg({ ocrEnabled: v })}
            description="Create searchable PDF with hidden text layer"
          />
          {options.image.ocrEnabled && (
            <div className="ml-4 space-y-2 border-l-2 border-purple-200 pl-3">
              <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>Scan Cleanup:</p>
              <Toggle
                label="Deskew"
                checked={options.image.scanCleanup.deskew}
                onChange={v => updateImg({ scanCleanup: { ...options.image.scanCleanup, deskew: v } })}
              />
              <Toggle
                label="Denoise"
                checked={options.image.scanCleanup.denoise}
                onChange={v => updateImg({ scanCleanup: { ...options.image.scanCleanup, denoise: v } })}
              />
              <Toggle
                label="Background whitening"
                checked={options.image.scanCleanup.backgroundWhitening}
                onChange={v => updateImg({ scanCleanup: { ...options.image.scanCleanup, backgroundWhitening: v } })}
              />
              <Toggle
                label="Border crop"
                checked={options.image.scanCleanup.borderCrop}
                onChange={v => updateImg({ scanCleanup: { ...options.image.scanCleanup, borderCrop: v } })}
              />
              <Toggle
                label="Contrast boost"
                checked={options.image.scanCleanup.contrastBoost}
                onChange={v => updateImg({ scanCleanup: { ...options.image.scanCleanup, contrastBoost: v } })}
              />
            </div>
          )}
        </Section>
      )}

      {/* HTML-specific */}
      {isHtml && (
        <Section title="HTML Options" icon={<Globe className="w-3.5 h-3.5 text-cyan-500" />} defaultOpen>
          <Toggle
            label="Print CSS mode"
            checked={options.html.printCss}
            onChange={v => updateHtml({ printCss: v })}
            description="Render using print stylesheet (recommended)"
          />
          <Toggle
            label="Include backgrounds"
            checked={options.html.includeBackgrounds}
            onChange={v => updateHtml({ includeBackgrounds: v })}
          />
          <Toggle
            label="Page numbers"
            checked={options.html.pageNumbers}
            onChange={v => updateHtml({ pageNumbers: v })}
          />
          <Toggle
            label="Reader cleanup mode"
            checked={options.html.readerCleanup}
            onChange={v => updateHtml({ readerCleanup: v })}
            description="Strip navigation, ads, footers, and clutter"
          />
        </Section>
      )}

      {/* Text/Markdown-specific */}
      {isText && (
        <Section title="Text Options" icon={<Type className="w-3.5 h-3.5 text-gray-500" />} defaultOpen>
          {file.extension === "txt" && (
            <SelectField
              label="Text Mode"
              value={options.text.mode}
              onChange={v => updateText({ mode: v as any })}
              options={[
                { value: "wrapped", label: "Word-wrapped" },
                { value: "fixed-width", label: "Fixed-width (monospace)" },
                { value: "preserve-whitespace", label: "Preserve whitespace" },
              ]}
            />
          )}
          <SelectField
            label="Font Family"
            value={options.text.fontFamily}
            onChange={v => updateText({ fontFamily: v as any })}
            options={[
              { value: "sans-serif", label: "Sans-serif (Helvetica)" },
              { value: "serif", label: "Serif (Times)" },
              { value: "monospace", label: "Monospace (Courier)" },
            ]}
          />
          {(file.extension === "md" || file.extension === "markdown") && (
            <>
              <Toggle
                label="Generate TOC from headings"
                checked={options.text.generateToc}
                onChange={v => updateText({ generateToc: v })}
              />
              <Toggle
                label="Syntax-highlighted code blocks"
                checked={options.text.syntaxHighlight}
                onChange={v => updateText({ syntaxHighlight: v })}
              />
            </>
          )}
          <Toggle
            label="Auto title page"
            checked={options.text.titlePage}
            onChange={v => updateText({ titlePage: v })}
            description="Generate a title page from filename"
          />
        </Section>
      )}
    </div>
  );
}
