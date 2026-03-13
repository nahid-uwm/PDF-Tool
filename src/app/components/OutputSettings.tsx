import React, { useState } from "react";
import {
  Hash, Type, Droplets, BookMarked, List, Settings2, FileOutput, Lock,
  ChevronDown, ChevronRight, Info
} from "lucide-react";
import type { OutputSettings as OutputSettingsType } from "./store";

interface OutputSettingsProps {
  settings: OutputSettingsType;
  onChange: (settings: OutputSettingsType) => void;
  showToc?: boolean;
  showBookmarks?: boolean;
  showPageNumbers?: boolean;
  showWatermark?: boolean;
  showHeaderFooter?: boolean;
  showMetadata?: boolean;
  showOutput?: boolean;
}

function Section({ title, icon, children, defaultOpen = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-muted/50 transition-colors"
        aria-expanded={open}
      >
        {icon}
        <span className="flex-1 text-left text-foreground">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">{children}</div>}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 cursor-pointer">
      <span style={{ fontSize: "0.875rem" }} className="text-foreground">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? "bg-primary" : "bg-switch-background"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${checked ? "translate-x-4" : ""}`} />
      </button>
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex flex-col gap-1">
      <span style={{ fontSize: "0.75rem" }} className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-border bg-input-background text-foreground"
        style={{ fontSize: "0.875rem" }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function InputField({ label, value, onChange, type = "text", placeholder }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span style={{ fontSize: "0.75rem" }} className="text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-3 py-1.5 rounded-lg border border-border bg-input-background text-foreground"
        style={{ fontSize: "0.875rem" }}
      />
    </label>
  );
}

function RangeField({ label, value, onChange, min, max, unit }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; unit?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <div className="flex justify-between">
        <span style={{ fontSize: "0.75rem" }} className="text-muted-foreground">{label}</span>
        <span style={{ fontSize: "0.75rem" }} className="text-muted-foreground">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </label>
  );
}

export function OutputSettingsPanel({
  settings, onChange,
  showPageNumbers = true, showWatermark = true, showHeaderFooter = true,
  showToc = true, showBookmarks = true, showMetadata = true, showOutput = true
}: OutputSettingsProps) {
  const update = (partial: Partial<OutputSettingsType>) => onChange({ ...settings, ...partial });

  return (
    <div className="space-y-3">
      {showPageNumbers && (
        <Section title="Page Numbers" icon={<Hash className="w-4 h-4 text-muted-foreground" />}>
          <Toggle
            label="Add page numbers"
            checked={settings.pageNumbers.enabled}
            onChange={(v) => update({ pageNumbers: { ...settings.pageNumbers, enabled: v } })}
          />
          {settings.pageNumbers.enabled && (
            <>
              <SelectField
                label="Format"
                value={settings.pageNumbers.format}
                onChange={(v) => update({ pageNumbers: { ...settings.pageNumbers, format: v as any } })}
                options={[
                  { value: "1", label: "1, 2, 3..." },
                  { value: "Page X of Y", label: "Page 1 of 40" },
                  { value: "roman", label: "i, ii, iii..." },
                  { value: "bates", label: "Bates numbering" },
                ]}
              />
              <SelectField
                label="Position"
                value={settings.pageNumbers.position}
                onChange={(v) => update({ pageNumbers: { ...settings.pageNumbers, position: v as any } })}
                options={[
                  { value: "bottom-center", label: "Bottom Center" },
                  { value: "bottom-left", label: "Bottom Left" },
                  { value: "bottom-right", label: "Bottom Right" },
                  { value: "top-center", label: "Top Center" },
                  { value: "top-left", label: "Top Left" },
                  { value: "top-right", label: "Top Right" },
                ]}
              />
              <InputField
                label="Start from"
                value={settings.pageNumbers.startFrom}
                onChange={(v) => update({ pageNumbers: { ...settings.pageNumbers, startFrom: parseInt(v) || 1 } })}
                type="number"
              />
              <Toggle
                label="Skip first page"
                checked={settings.pageNumbers.skipFirst}
                onChange={(v) => update({ pageNumbers: { ...settings.pageNumbers, skipFirst: v } })}
              />
              <RangeField
                label="Font size"
                value={settings.pageNumbers.fontSize}
                onChange={(v) => update({ pageNumbers: { ...settings.pageNumbers, fontSize: v } })}
                min={6}
                max={24}
                unit="pt"
              />
              {settings.pageNumbers.format === "bates" && (
                <>
                  <InputField
                    label="Bates prefix"
                    value={settings.pageNumbers.batesPrefix}
                    onChange={(v) => update({ pageNumbers: { ...settings.pageNumbers, batesPrefix: v } })}
                    placeholder="DOC-"
                  />
                  <InputField
                    label="Digits"
                    value={settings.pageNumbers.batesDigits}
                    onChange={(v) => update({ pageNumbers: { ...settings.pageNumbers, batesDigits: parseInt(v) || 6 } })}
                    type="number"
                  />
                </>
              )}
            </>
          )}
        </Section>
      )}

      {showWatermark && (
        <Section title="Watermark" icon={<Droplets className="w-4 h-4 text-muted-foreground" />}>
          <Toggle
            label="Add watermark"
            checked={settings.watermark.enabled}
            onChange={(v) => update({ watermark: { ...settings.watermark, enabled: v } })}
          />
          {settings.watermark.enabled && (
            <>
              <InputField
                label="Watermark text"
                value={settings.watermark.text}
                onChange={(v) => update({ watermark: { ...settings.watermark, text: v } })}
                placeholder="CONFIDENTIAL"
              />
              <RangeField
                label="Opacity"
                value={settings.watermark.opacity}
                onChange={(v) => update({ watermark: { ...settings.watermark, opacity: v } })}
                min={1}
                max={100}
                unit="%"
              />
              <RangeField
                label="Font size"
                value={settings.watermark.fontSize}
                onChange={(v) => update({ watermark: { ...settings.watermark, fontSize: v } })}
                min={12}
                max={120}
                unit="pt"
              />
              <RangeField
                label="Rotation"
                value={settings.watermark.rotation}
                onChange={(v) => update({ watermark: { ...settings.watermark, rotation: v } })}
                min={-90}
                max={90}
                unit="deg"
              />
              <InputField
                label="Color"
                value={settings.watermark.color}
                onChange={(v) => update({ watermark: { ...settings.watermark, color: v } })}
                type="color"
              />
            </>
          )}
        </Section>
      )}

      {showHeaderFooter && (
        <Section title="Headers & Footers" icon={<Type className="w-4 h-4 text-muted-foreground" />}>
          <Toggle
            label="Add headers/footers"
            checked={settings.headerFooter.enabled}
            onChange={(v) => update({ headerFooter: { ...settings.headerFooter, enabled: v } })}
          />
          {settings.headerFooter.enabled && (
            <>
              <p style={{ fontSize: "0.75rem" }} className="text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3" /> Use {"{page}"}, {"{total}"}, {"{date}"}, {"{filename}"} as tokens
              </p>
              <InputField label="Header Left" value={settings.headerFooter.headerLeft} onChange={(v) => update({ headerFooter: { ...settings.headerFooter, headerLeft: v } })} />
              <InputField label="Header Center" value={settings.headerFooter.headerCenter} onChange={(v) => update({ headerFooter: { ...settings.headerFooter, headerCenter: v } })} />
              <InputField label="Header Right" value={settings.headerFooter.headerRight} onChange={(v) => update({ headerFooter: { ...settings.headerFooter, headerRight: v } })} />
              <InputField label="Footer Left" value={settings.headerFooter.footerLeft} onChange={(v) => update({ headerFooter: { ...settings.headerFooter, footerLeft: v } })} />
              <InputField label="Footer Center" value={settings.headerFooter.footerCenter} onChange={(v) => update({ headerFooter: { ...settings.headerFooter, footerCenter: v } })} />
              <InputField label="Footer Right" value={settings.headerFooter.footerRight} onChange={(v) => update({ headerFooter: { ...settings.headerFooter, footerRight: v } })} />
            </>
          )}
        </Section>
      )}

      {showToc && (
        <Section title="Table of Contents" icon={<List className="w-4 h-4 text-muted-foreground" />}>
          <Toggle
            label="Generate TOC"
            checked={settings.toc.enabled}
            onChange={(v) => update({ toc: { ...settings.toc, enabled: v } })}
          />
          {settings.toc.enabled && (
            <>
              <InputField
                label="TOC title"
                value={settings.toc.title}
                onChange={(v) => update({ toc: { ...settings.toc, title: v } })}
              />
              <SelectField
                label="Position"
                value={settings.toc.position}
                onChange={(v) => update({ toc: { ...settings.toc, position: v as any } })}
                options={[
                  { value: "beginning", label: "Beginning of document" },
                  { value: "after-cover", label: "After cover page" },
                ]}
              />
              <Toggle
                label="Clickable links"
                checked={settings.toc.clickable}
                onChange={(v) => update({ toc: { ...settings.toc, clickable: v } })}
              />
            </>
          )}
        </Section>
      )}

      {showBookmarks && (
        <Section title="Bookmarks" icon={<BookMarked className="w-4 h-4 text-muted-foreground" />}>
          <Toggle
            label="Include bookmarks"
            checked={settings.bookmarks.enabled}
            onChange={(v) => update({ bookmarks: { ...settings.bookmarks, enabled: v } })}
          />
          {settings.bookmarks.enabled && (
            <>
              <SelectField
                label="Source"
                value={settings.bookmarks.source}
                onChange={(v) => update({ bookmarks: { ...settings.bookmarks, source: v as any } })}
                options={[
                  { value: "filenames", label: "From filenames" },
                  { value: "headings", label: "From document headings" },
                  { value: "existing", label: "From existing bookmarks" },
                  { value: "sheets", label: "From sheet names" },
                  { value: "slides", label: "From slide titles" },
                ]}
              />
              <SelectField
                label="Strategy"
                value={settings.bookmarks.strategy}
                onChange={(v) => update({ bookmarks: { ...settings.bookmarks, strategy: v as any } })}
                options={[
                  { value: "keep-all", label: "Keep all bookmarks" },
                  { value: "flatten", label: "Flatten to one level" },
                  { value: "nest-by-file", label: "Nest by source file" },
                  { value: "fresh", label: "Create fresh tree" },
                ]}
              />
            </>
          )}
        </Section>
      )}

      {showMetadata && (
        <Section title="Document Metadata" icon={<Settings2 className="w-4 h-4 text-muted-foreground" />}>
          <InputField label="Title" value={settings.metadata.title} onChange={(v) => update({ metadata: { ...settings.metadata, title: v } })} placeholder="Document Title" />
          <InputField label="Author" value={settings.metadata.author} onChange={(v) => update({ metadata: { ...settings.metadata, author: v } })} placeholder="Author Name" />
          <InputField label="Subject" value={settings.metadata.subject} onChange={(v) => update({ metadata: { ...settings.metadata, subject: v } })} placeholder="Subject" />
          <InputField label="Keywords" value={settings.metadata.keywords} onChange={(v) => update({ metadata: { ...settings.metadata, keywords: v } })} placeholder="keyword1, keyword2" />
        </Section>
      )}

      {showOutput && (
        <Section title="Output Options" icon={<FileOutput className="w-4 h-4 text-muted-foreground" />} defaultOpen>
          <SelectField
            label="Output format"
            value={settings.outputFormat}
            onChange={(v) => update({ outputFormat: v as any })}
            options={[
              { value: "standard", label: "Standard PDF" },
              { value: "web-optimized", label: "Web-optimized (Linearized)" },
              { value: "pdf-a", label: "PDF/A (Archival)" },
              { value: "print-ready", label: "Print-ready (High Quality)" },
              { value: "compressed", label: "Compressed (Small Size)" },
            ]}
          />
          <SelectField
            label="Compression"
            value={settings.compression}
            onChange={(v) => update({ compression: v as any })}
            options={[
              { value: "none", label: "No compression" },
              { value: "balanced", label: "Balanced" },
              { value: "strong", label: "Strong compression" },
            ]}
          />
          <Toggle
            label="Flatten forms/annotations"
            checked={settings.flatten}
            onChange={(v) => update({ flatten: v })}
          />
          <InputField
            label="Password protection"
            value={settings.password}
            onChange={(v) => update({ password: v })}
            type="password"
            placeholder="Leave empty for no protection"
          />
        </Section>
      )}
    </div>
  );
}
