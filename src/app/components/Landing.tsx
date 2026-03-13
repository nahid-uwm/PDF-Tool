import React from "react";
import { useNavigate } from "react-router";
import {
  Merge, Split, FileOutput, LayoutGrid, Shield, Zap, Eye, Globe,
  FileText, Image, Table2, Presentation, BookOpen, Hash, Droplets,
  BookMarked, List, Scissors, ArrowRight, Sparkles, Lock, Trash2
} from "lucide-react";
import { motion } from "motion/react";

const tools = [
  {
    id: "merge",
    title: "Merge PDFs",
    description: "Combine multiple PDFs and other file types into one organized document with TOC, bookmarks, and page numbers.",
    icon: Merge,
    color: "from-red-500 to-orange-500",
    bgColor: "bg-red-50",
    iconColor: "text-red-600",
    features: ["Mixed-file merge", "Visual organizer", "Drag & drop reorder", "Auto TOC"],
  },
  {
    id: "split",
    title: "Split PDF",
    description: "Split PDFs by page ranges, bookmarks, blank pages, every N pages, or into equal parts with visual preview.",
    icon: Split,
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
    features: ["10+ split modes", "Visual preview", "Custom naming", "Batch export"],
  },
  {
    id: "convert",
    title: "Convert to PDF",
    description: "Convert Word, Excel, PowerPoint, images, and 50+ file formats to PDF with full formatting preservation.",
    icon: FileOutput,
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-50",
    iconColor: "text-green-600",
    features: ["50+ formats", "Quality preservation", "Batch convert", "Optional merge"],
  },
  {
    id: "organize",
    title: "Organize Pages",
    description: "Rearrange, rotate, delete, duplicate, and extract pages from PDFs with an intuitive visual editor.",
    icon: LayoutGrid,
    color: "from-purple-500 to-violet-500",
    bgColor: "bg-purple-50",
    iconColor: "text-purple-600",
    features: ["Page-level control", "Rotate & crop", "Insert pages", "Extract pages"],
  },
];

const features = [
  { icon: Shield, title: "Privacy First", desc: "Files are processed temporarily and auto-deleted. No data stored." },
  { icon: Zap, title: "Lightning Fast", desc: "Client-side processing for instant results. No upload wait." },
  { icon: Eye, title: "Visual Preview", desc: "See exactly what you'll get before downloading." },
  { icon: Globe, title: "No Account Needed", desc: "Completely anonymous. No login, signup, or email required." },
];

const supportedFormats = [
  { icon: FileText, label: "PDF", color: "text-red-500" },
  { icon: FileText, label: "Word", color: "text-blue-500" },
  { icon: Table2, label: "Excel", color: "text-green-500" },
  { icon: Presentation, label: "PowerPoint", color: "text-orange-500" },
  { icon: Image, label: "Images", color: "text-purple-500" },
  { icon: BookOpen, label: "EPUB", color: "text-teal-500" },
];

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span style={{ fontSize: "0.875rem" }} className="text-primary">Production-grade PDF tools, free & private</span>
            </div>
            <h1 className="max-w-3xl mx-auto text-foreground" style={{ fontSize: "clamp(1.75rem, 5vw, 3rem)", lineHeight: 1.1 }}>
              The complete PDF suite<br />
              <span className="bg-gradient-to-r from-red-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                that respects your privacy
              </span>
            </h1>
            <p className="mt-5 max-w-2xl mx-auto text-muted-foreground" style={{ fontSize: "1.125rem" }}>
              Merge, split, convert, and organize PDFs without creating an account.
              Your files never leave your browser for simple operations.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Tool Cards */}
      <section className="max-w-6xl mx-auto px-4 -mt-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {tools.map((tool, i) => (
            <motion.button
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              onClick={() => navigate(`/${tool.id}`)}
              className="group relative flex flex-col text-left p-6 md:p-8 rounded-2xl border border-border bg-card hover:shadow-xl hover:border-primary/20 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${tool.bgColor}`}>
                  <tool.icon className={`w-6 h-6 ${tool.iconColor}`} />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="text-foreground mb-2">{tool.title}</h2>
              <p className="text-muted-foreground mb-4 flex-1" style={{ fontSize: "0.875rem" }}>{tool.description}</p>
              <div className="flex flex-wrap gap-2">
                {tool.features.map(f => (
                  <span key={f} className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                    {f}
                  </span>
                ))}
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-muted/30 border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-center text-foreground mb-10">Why choose PDF Suite?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                className="flex flex-col items-center text-center p-6 rounded-xl bg-card border border-border"
              >
                <div className="p-3 rounded-xl bg-primary/5 mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-foreground mb-1">{f.title}</h3>
                <p className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Formats */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-center text-foreground mb-2">50+ Supported Formats</h2>
        <p className="text-center text-muted-foreground mb-8" style={{ fontSize: "0.875rem" }}>
          Upload any of these formats and we'll convert them to PDF automatically
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {supportedFormats.map(f => (
            <div key={f.label} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card">
              <f.icon className={`w-4 h-4 ${f.color}`} />
              <span className="text-foreground" style={{ fontSize: "0.875rem" }}>{f.label}</span>
            </div>
          ))}
        </div>
        <p className="text-center mt-4 text-muted-foreground" style={{ fontSize: "0.75rem" }}>
          PDF, DOCX, DOC, ODT, RTF, TXT, MD, HTML, XLSX, XLS, ODS, CSV, PPTX, PPT, ODP, JPG, PNG, GIF, BMP, TIFF, WebP, SVG, HEIC, AVIF, EPUB, XPS, and more
        </p>
      </section>

      {/* Privacy Banner */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-card to-primary/3 border border-border p-8 md:p-12">
          <div className="relative flex flex-col md:flex-row items-center gap-6">
            <div className="p-4 rounded-2xl bg-primary/10">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-foreground mb-2">Your privacy is guaranteed</h3>
              <p className="text-muted-foreground max-w-xl" style={{ fontSize: "0.875rem" }}>
                No signup required. Files are processed temporarily and automatically deleted.
                You can manually delete all files at any time. No tracking, no accounts, no data retention.
              </p>
            </div>
            <div className="md:ml-auto flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 text-green-700" style={{ fontSize: "0.875rem" }}>
                <Shield className="w-4 h-4" /> Auto-cleanup
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 text-red-700" style={{ fontSize: "0.875rem" }}>
                <Trash2 className="w-4 h-4" /> Instant delete
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
