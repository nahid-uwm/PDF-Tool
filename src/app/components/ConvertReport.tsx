import React from "react";
import {
  X, FileText, AlertTriangle, Info, AlertCircle, CheckCircle,
  Type, Image, Cpu, Clock, FileOutput, Languages
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { ConversionReport, ConvertFileItem } from "./convert-types";
import { FIDELITY_INFO, ENGINE_INFO, STATUS_INFO } from "./convert-types";
import { formatFileSize } from "./store";

interface ConvertReportProps {
  file: ConvertFileItem;
  onClose: () => void;
}

function SeverityIcon({ severity }: { severity: "info" | "warning" | "error" }) {
  switch (severity) {
    case "info": return <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />;
    case "warning": return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />;
    case "error": return <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />;
  }
}

export function ConvertReportModal({ file, onClose }: ConvertReportProps) {
  const report = file.report;
  if (!report) return null;

  const fidelityInfo = FIDELITY_INFO[report.fidelity];
  const engineInfo = ENGINE_INFO[report.engine];
  const warningCount = report.warnings.filter(w => w.severity === "warning").length;
  const errorCount = report.warnings.filter(w => w.severity === "error").length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <FileOutput className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <h3 className="text-foreground truncate">{file.name}</h3>
            <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>Conversion Report</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-muted/50">
              <p className="text-muted-foreground" style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Fidelity</p>
              <p className={`mt-0.5 ${fidelityInfo.color}`} style={{ fontSize: "0.8125rem" }}>{fidelityInfo.label}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/50">
              <p className="text-muted-foreground" style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pages</p>
              <p className="mt-0.5 text-foreground" style={{ fontSize: "0.8125rem" }}>{report.outputPageCount}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/50">
              <p className="text-muted-foreground" style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Output Size</p>
              <p className="mt-0.5 text-foreground" style={{ fontSize: "0.8125rem" }}>{formatFileSize(report.outputSize)}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/50">
              <p className="text-muted-foreground" style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Time</p>
              <p className="mt-0.5 text-foreground" style={{ fontSize: "0.8125rem" }}>{(report.conversionTime / 1000).toFixed(1)}s</p>
            </div>
          </div>

          {/* Engine & Source */}
          <div className="space-y-2">
            <h4 className="text-foreground" style={{ fontSize: "0.8125rem" }}>Conversion Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" style={{ fontSize: "0.8125rem" }}>
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Engine:</span>
                <span className="text-foreground">{engineInfo.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Source:</span>
                <span className="text-foreground">{report.sourceType.toUpperCase()} ({formatFileSize(report.sourceSize)})</span>
              </div>
              <div className="flex items-center gap-2">
                <Image className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Images:</span>
                <span className="text-foreground">{report.embeddedImagesCount} embedded</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Converted:</span>
                <span className="text-foreground">{new Date(report.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Fonts */}
          {(report.detectedFonts.length > 0 || report.substitutedFonts.length > 0) && (
            <div className="space-y-2">
              <h4 className="text-foreground flex items-center gap-2" style={{ fontSize: "0.8125rem" }}>
                <Type className="w-3.5 h-3.5" /> Font Report
              </h4>
              {report.detectedFonts.length > 0 && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>Detected fonts:</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {report.detectedFonts.map((font, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-card border border-border text-foreground" style={{ fontSize: "0.75rem" }}>{font}</span>
                    ))}
                  </div>
                </div>
              )}
              {report.substitutedFonts.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-amber-700" style={{ fontSize: "0.75rem" }}>Font substitutions:</p>
                  <div className="mt-1.5 space-y-1">
                    {report.substitutedFonts.map((sub, i) => (
                      <div key={i} className="flex items-center gap-2" style={{ fontSize: "0.75rem" }}>
                        <span className="text-amber-800 line-through">{sub.original}</span>
                        <span className="text-amber-600">→</span>
                        <span className="text-amber-800">{sub.replacement}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OCR Status */}
          {report.ocrStatus !== "none" && (
            <div className="space-y-2">
              <h4 className="text-foreground flex items-center gap-2" style={{ fontSize: "0.8125rem" }}>
                <Languages className="w-3.5 h-3.5" /> OCR Status
              </h4>
              <div className="p-3 rounded-lg bg-muted/30" style={{ fontSize: "0.8125rem" }}>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`${report.ocrStatus === "applied" ? "text-emerald-600" : report.ocrStatus === "partial" ? "text-amber-600" : "text-red-600"}`}>
                    {report.ocrStatus === "applied" ? "Applied" : report.ocrStatus === "partial" ? "Partial" : "Failed"}
                  </span>
                  {report.ocrConfidence > 0 && (
                    <>
                      <span className="text-muted-foreground">Confidence:</span>
                      <span className="text-foreground">{report.ocrConfidence}%</span>
                    </>
                  )}
                </div>
                {report.ocrLanguages.length > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-muted-foreground">Languages:</span>
                    <span className="text-foreground">{report.ocrLanguages.join(", ")}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Unsupported / Rasterized Elements */}
          {(report.unsupportedElements.length > 0 || report.rasterizedElements.length > 0) && (
            <div className="space-y-2">
              <h4 className="text-foreground" style={{ fontSize: "0.8125rem" }}>Element Notes</h4>
              {report.unsupportedElements.length > 0 && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-red-700" style={{ fontSize: "0.75rem" }}>Unsupported elements ({report.unsupportedElements.length}):</p>
                  <ul className="mt-1 space-y-0.5">
                    {report.unsupportedElements.map((el, i) => (
                      <li key={i} className="text-red-600 flex items-center gap-1.5" style={{ fontSize: "0.75rem" }}>
                        <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" /> {el}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {report.rasterizedElements.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-amber-700" style={{ fontSize: "0.75rem" }}>Rasterized at high-DPI ({report.rasterizedElements.length}):</p>
                  <ul className="mt-1 space-y-0.5">
                    {report.rasterizedElements.map((el, i) => (
                      <li key={i} className="text-amber-600 flex items-center gap-1.5" style={{ fontSize: "0.75rem" }}>
                        <span className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" /> {el}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Warnings List */}
          {report.warnings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-foreground flex items-center gap-2" style={{ fontSize: "0.8125rem" }}>
                <AlertTriangle className="w-3.5 h-3.5" />
                Warnings ({warningCount}) {errorCount > 0 && <span className="text-red-600">/ Errors ({errorCount})</span>}
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {report.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30" style={{ fontSize: "0.75rem" }}>
                    <SeverityIcon severity={w.severity} />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground">{w.message}</p>
                      {w.detail && <p className="text-muted-foreground mt-0.5">{w.detail}</p>}
                      {w.page !== undefined && <p className="text-muted-foreground mt-0.5">Page {w.page}</p>}
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0" style={{ fontSize: "0.625rem" }}>{w.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Warnings */}
          {report.warnings.length === 0 && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-emerald-700" style={{ fontSize: "0.875rem" }}>Clean conversion — no warnings</p>
                <p className="text-emerald-600" style={{ fontSize: "0.75rem" }}>All elements were successfully converted without issues.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            style={{ fontSize: "0.875rem" }}
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
