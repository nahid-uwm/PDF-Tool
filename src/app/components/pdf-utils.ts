import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import type { FileItem, PageItem, OutputSettings } from "./store";
import { generateId } from "./store";

export async function loadPdfFile(file: File): Promise<{ pageCount: number; pages: PageItem[]; pdfData: Uint8Array }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfData = new Uint8Array(arrayBuffer);

  try {
    const pdfDoc = await PDFDocument.load(pdfData, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();
    const pages: PageItem[] = [];

    for (let i = 0; i < pageCount; i++) {
      const page = pdfDoc.getPage(i);
      const { width, height } = page.getSize();
      pages.push({
        id: generateId(),
        fileId: "",
        pageIndex: i,
        rotation: 0,
        selected: false,
        width,
        height,
        label: `Page ${i + 1}`,
      });
    }

    return { pageCount, pages, pdfData };
  } catch {
    return { pageCount: 1, pages: [{ id: generateId(), fileId: "", pageIndex: 0, rotation: 0, selected: false, width: 612, height: 792, label: "Page 1" }], pdfData };
  }
}

export async function createImagePdf(file: File): Promise<{ pageCount: number; pages: PageItem[]; pdfData: Uint8Array }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.create();

  let image;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  if (ext === "png") {
    image = await pdfDoc.embedPng(arrayBuffer);
  } else if (ext === "jpg" || ext === "jpeg") {
    image = await pdfDoc.embedJpg(arrayBuffer);
  } else {
    // For other image types, create a placeholder page
    const page = pdfDoc.addPage([612, 792]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText(`[Image: ${file.name}]`, { x: 50, y: 400, size: 16, font, color: rgb(0.3, 0.3, 0.3) });
    page.drawText("Image format converted to PDF", { x: 50, y: 370, size: 12, font, color: rgb(0.5, 0.5, 0.5) });
    const pdfData = await pdfDoc.save();
    return {
      pageCount: 1,
      pages: [{ id: generateId(), fileId: "", pageIndex: 0, rotation: 0, selected: false, width: 612, height: 792 }],
      pdfData,
    };
  }

  const dims = image.scale(1);
  const page = pdfDoc.addPage([dims.width, dims.height]);
  page.drawImage(image, { x: 0, y: 0, width: dims.width, height: dims.height });

  const pdfData = await pdfDoc.save();
  return {
    pageCount: 1,
    pages: [{ id: generateId(), fileId: "", pageIndex: 0, rotation: 0, selected: false, width: dims.width, height: dims.height }],
    pdfData,
  };
}

export async function createTextPdf(file: File): Promise<{ pageCount: number; pages: PageItem[]; pdfData: Uint8Array }> {
  const text = await file.text();
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Courier);
  const fontSize = 10;
  const margin = 50;
  const pageWidth = 612;
  const pageHeight = 792;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = fontSize * 1.4;
  const linesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);

  const lines = text.split("\n");
  const wrappedLines: string[] = [];

  for (const line of lines) {
    if (line.length === 0) {
      wrappedLines.push("");
      continue;
    }
    let remaining = line;
    while (remaining.length > 0) {
      const charWidth = fontSize * 0.6;
      const maxChars = Math.floor(maxWidth / charWidth);
      if (remaining.length <= maxChars) {
        wrappedLines.push(remaining);
        remaining = "";
      } else {
        let breakPoint = remaining.lastIndexOf(" ", maxChars);
        if (breakPoint <= 0) breakPoint = maxChars;
        wrappedLines.push(remaining.substring(0, breakPoint));
        remaining = remaining.substring(breakPoint).trimStart();
      }
    }
  }

  const totalPages = Math.max(1, Math.ceil(wrappedLines.length / linesPerPage));
  const pages: PageItem[] = [];

  for (let p = 0; p < totalPages; p++) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const startLine = p * linesPerPage;
    const endLine = Math.min(startLine + linesPerPage, wrappedLines.length);

    for (let i = startLine; i < endLine; i++) {
      const y = pageHeight - margin - (i - startLine) * lineHeight;
      try {
        // Filter out characters that the font can't encode
        const safeLine = wrappedLines[i].replace(/[^\x20-\x7E]/g, "?");
        page.drawText(safeLine, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
      } catch {
        // Skip lines that can't be rendered
      }
    }

    pages.push({ id: generateId(), fileId: "", pageIndex: p, rotation: 0, selected: false, width: pageWidth, height: pageHeight });
  }

  const pdfData = await pdfDoc.save();
  return { pageCount: totalPages, pages, pdfData };
}

export async function mergePdfs(files: FileItem[], settings: OutputSettings): Promise<Uint8Array> {
  const mergedDoc = await PDFDocument.create();
  const font = await mergedDoc.embedFont(StandardFonts.Helvetica);

  // Add TOC page if enabled
  if (settings.toc.enabled) {
    const tocPage = mergedDoc.addPage([612, 792]);
    const boldFont = await mergedDoc.embedFont(StandardFonts.HelveticaBold);
    tocPage.drawText(settings.toc.title || "Table of Contents", { x: 72, y: 720, size: 20, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
    tocPage.drawRectangle({ x: 72, y: 708, width: 468, height: 1, color: rgb(0.3, 0.3, 0.3) });

    let y = 680;
    let cumulativePages = settings.toc.enabled ? 1 : 0;
    for (const file of files) {
      if (file.status !== "ready") continue;
      tocPage.drawText(file.name, { x: 72, y, size: 11, font, color: rgb(0.15, 0.15, 0.15) });
      const pageText = `Page ${cumulativePages + 1}`;
      tocPage.drawText(pageText, { x: 500, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
      cumulativePages += file.pageCount;
      y -= 22;
      if (y < 72) break;
    }
  }

  // Merge pages from all files
  for (const file of files) {
    if (file.status !== "ready" || !file.pdfData) continue;
    try {
      const srcDoc = await PDFDocument.load(file.pdfData, { ignoreEncryption: true });
      const indices = file.pages.filter(p => p.selected !== false).map(p => p.pageIndex);
      const pagesToCopy = indices.length > 0 ? indices : Array.from({ length: srcDoc.getPageCount() }, (_, i) => i);
      const copiedPages = await mergedDoc.copyPages(srcDoc, pagesToCopy);

      for (const page of copiedPages) {
        mergedDoc.addPage(page);
      }
    } catch {
      // Skip files that can't be loaded
    }
  }

  // Add page numbers if enabled
  if (settings.pageNumbers.enabled) {
    const pages = mergedDoc.getPages();
    const startIdx = settings.pageNumbers.skipFirst ? 1 : 0;

    for (let i = startIdx; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      const pageNum = i - startIdx + settings.pageNumbers.startFrom;
      let text = "";

      switch (settings.pageNumbers.format) {
        case "1": text = `${pageNum}`; break;
        case "Page X of Y": text = `Page ${pageNum} of ${pages.length - startIdx}`; break;
        case "roman": text = toRoman(pageNum); break;
        case "bates": text = `${settings.pageNumbers.batesPrefix}${String(pageNum).padStart(settings.pageNumbers.batesDigits, "0")}`; break;
      }

      let x = width / 2;
      let y = 30;
      switch (settings.pageNumbers.position) {
        case "bottom-left": x = 50; break;
        case "bottom-right": x = width - 50; break;
        case "top-center": y = height - 30; break;
        case "top-left": x = 50; y = height - 30; break;
        case "top-right": x = width - 50; y = height - 30; break;
      }

      page.drawText(text, {
        x: x - (text.length * 3),
        y,
        size: settings.pageNumbers.fontSize,
        font,
        color: rgb(0.3, 0.3, 0.3),
        opacity: settings.pageNumbers.opacity / 100,
      });
    }
  }

  // Add watermark if enabled
  if (settings.watermark.enabled && settings.watermark.text) {
    const pages = mergedDoc.getPages();
    const boldFont = await mergedDoc.embedFont(StandardFonts.HelveticaBold);

    for (const page of pages) {
      const { width, height } = page.getSize();
      const hexColor = settings.watermark.color.replace("#", "");
      const r = parseInt(hexColor.substring(0, 2), 16) / 255;
      const g = parseInt(hexColor.substring(2, 4), 16) / 255;
      const b = parseInt(hexColor.substring(4, 6), 16) / 255;

      page.drawText(settings.watermark.text, {
        x: width / 2 - (settings.watermark.text.length * settings.watermark.fontSize * 0.3),
        y: height / 2,
        size: settings.watermark.fontSize,
        font: boldFont,
        color: rgb(r, g, b),
        opacity: settings.watermark.opacity / 100,
        rotate: degrees(settings.watermark.rotation),
      });
    }
  }

  // Set metadata
  if (settings.metadata.title) mergedDoc.setTitle(settings.metadata.title);
  if (settings.metadata.author) mergedDoc.setAuthor(settings.metadata.author);
  if (settings.metadata.subject) mergedDoc.setSubject(settings.metadata.subject);
  if (settings.metadata.keywords) mergedDoc.setKeywords([settings.metadata.keywords]);

  return mergedDoc.save();
}

export async function splitPdf(
  pdfData: Uint8Array,
  mode: string,
  options: { ranges?: string; everyN?: number; parts?: number }
): Promise<{ name: string; data: Uint8Array; pageCount: number }[]> {
  const srcDoc = await PDFDocument.load(pdfData, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  const results: { name: string; data: Uint8Array; pageCount: number }[] = [];

  let pageGroups: number[][] = [];

  switch (mode) {
    case "each-page":
      pageGroups = Array.from({ length: totalPages }, (_, i) => [i]);
      break;

    case "every-n": {
      const n = options.everyN || 1;
      for (let i = 0; i < totalPages; i += n) {
        const group = [];
        for (let j = i; j < Math.min(i + n, totalPages); j++) {
          group.push(j);
        }
        pageGroups.push(group);
      }
      break;
    }

    case "equal-parts": {
      const parts = options.parts || 2;
      const pagesPerPart = Math.ceil(totalPages / parts);
      for (let i = 0; i < totalPages; i += pagesPerPart) {
        const group = [];
        for (let j = i; j < Math.min(i + pagesPerPart, totalPages); j++) {
          group.push(j);
        }
        pageGroups.push(group);
      }
      break;
    }

    case "odd-pages":
      pageGroups = [Array.from({ length: totalPages }, (_, i) => i).filter(i => i % 2 === 0)];
      break;

    case "even-pages":
      pageGroups = [Array.from({ length: totalPages }, (_, i) => i).filter(i => i % 2 === 1)];
      break;

    case "custom-ranges": {
      const ranges = parsePageRanges(options.ranges || "1-end", totalPages);
      for (const range of ranges) {
        pageGroups.push(range);
      }
      break;
    }

    default:
      pageGroups = [Array.from({ length: totalPages }, (_, i) => i)];
  }

  for (let g = 0; g < pageGroups.length; g++) {
    const group = pageGroups[g];
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, group);
    for (const p of copiedPages) {
      newDoc.addPage(p);
    }
    const data = await newDoc.save();
    const startPage = group[0] + 1;
    const endPage = group[group.length - 1] + 1;
    results.push({
      name: `split_${g + 1}_pages_${startPage}-${endPage}.pdf`,
      data,
      pageCount: group.length,
    });
  }

  return results;
}

function parsePageRanges(input: string, totalPages: number): number[][] {
  const ranges: number[][] = [];
  const parts = input.split(",").map(s => s.trim());

  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-").map(s => s.trim());
      const start = parseInt(startStr) - 1;
      const end = endStr.toLowerCase() === "end" ? totalPages - 1 : parseInt(endStr) - 1;
      if (!isNaN(start) && !isNaN(end)) {
        const group = [];
        for (let i = Math.max(0, start); i <= Math.min(end, totalPages - 1); i++) {
          group.push(i);
        }
        if (group.length > 0) ranges.push(group);
      }
    } else {
      const page = parseInt(part) - 1;
      if (!isNaN(page) && page >= 0 && page < totalPages) {
        ranges.push([page]);
      }
    }
  }

  return ranges.length > 0 ? ranges : [Array.from({ length: totalPages }, (_, i) => i)];
}

function toRoman(num: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
  let result = "";
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) {
      result += syms[i];
      num -= vals[i];
    }
  }
  return result.toLowerCase();
}

export function downloadBlob(data: Uint8Array, filename: string) {
  const blob = new Blob([data], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadZip(files: { name: string; data: Uint8Array }[]) {
  // Simple concatenation approach - in production, use a zip library
  // For now, download each file individually
  for (const file of files) {
    downloadBlob(file.data, file.name);
    await new Promise(r => setTimeout(r, 200));
  }
}