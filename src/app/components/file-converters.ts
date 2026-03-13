/**
 * Client-side file converters for DOCX, PPTX, XLSX, HTML, RTF, and more.
 * Uses a minimal ZIP reader (browser-native APIs) + pdf-lib for PDF generation.
 * No external dependencies beyond pdf-lib.
 */

import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib";
import { generateId } from "./store";
import type { PageItem } from "./store";

// ─── Minimal ZIP Reader ──────────────────────────────────────────────

interface ZipEntry {
  filename: string;
  compressedSize: number;
  uncompressedSize: number;
  compressionMethod: number;
  dataOffset: number;
}

function readZipEntries(buffer: ArrayBuffer): ZipEntry[] {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const entries: ZipEntry[] = [];

  // Find End of Central Directory record (scan from end)
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) return entries;

  const cdOffset = view.getUint32(eocdOffset + 16, true);
  const cdCount = view.getUint16(eocdOffset + 10, true);

  let pos = cdOffset;
  for (let i = 0; i < cdCount; i++) {
    if (pos + 46 > bytes.length) break;
    if (view.getUint32(pos, true) !== 0x02014b50) break;

    const compressionMethod = view.getUint16(pos + 10, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const uncompressedSize = view.getUint32(pos + 24, true);
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localHeaderOffset = view.getUint32(pos + 42, true);

    const nameBytes = bytes.slice(pos + 46, pos + 46 + nameLen);
    const filename = new TextDecoder().decode(nameBytes);

    // Calculate actual data offset from local file header
    let dataOffset = localHeaderOffset + 30;
    if (localHeaderOffset + 30 <= bytes.length) {
      const localNameLen = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
      dataOffset = localHeaderOffset + 30 + localNameLen + localExtraLen;
    }

    entries.push({
      filename,
      compressedSize,
      uncompressedSize,
      compressionMethod,
      dataOffset,
    });

    pos += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}

async function extractZipFile(buffer: ArrayBuffer, entry: ZipEntry): Promise<Uint8Array> {
  const compressed = new Uint8Array(buffer, entry.dataOffset, entry.compressedSize);

  if (entry.compressionMethod === 0) {
    // Stored (no compression)
    return compressed.slice();
  }

  if (entry.compressionMethod === 8) {
    // Deflate - use browser's DecompressionStream
    try {
      const ds = new DecompressionStream("deflate-raw");
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();

      const writePromise = writer.write(compressed).then(() => writer.close());

      const chunks: Uint8Array[] = [];
      let totalLen = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalLen += value.length;
      }
      await writePromise;

      const result = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      return result;
    } catch {
      // Fallback: return compressed data as-is
      return compressed.slice();
    }
  }

  return compressed.slice();
}

async function readZipFileAsText(buffer: ArrayBuffer, filename: string): Promise<string | null> {
  const entries = readZipEntries(buffer);
  const entry = entries.find(e => e.filename === filename || e.filename.toLowerCase() === filename.toLowerCase());
  if (!entry) return null;
  const data = await extractZipFile(buffer, entry);
  return new TextDecoder("utf-8").decode(data);
}

async function readZipFileAsBytes(buffer: ArrayBuffer, filename: string): Promise<Uint8Array | null> {
  const entries = readZipEntries(buffer);
  const entry = entries.find(e => e.filename === filename || e.filename.toLowerCase() === filename.toLowerCase());
  if (!entry) return null;
  return extractZipFile(buffer, entry);
}

async function listZipFiles(buffer: ArrayBuffer): Promise<string[]> {
  return readZipEntries(buffer).map(e => e.filename);
}

// ─── XML Parsing Helpers ─────────────────────────────────────────────

function parseXml(xmlStr: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(xmlStr, "application/xml");
}

function getTextContent(node: Element | Document, selector: string): string {
  const elements = node.querySelectorAll(selector);
  const texts: string[] = [];
  elements.forEach(el => {
    const text = el.textContent?.trim();
    if (text) texts.push(text);
  });
  return texts.join(" ");
}

function getAllTextNodes(node: Element): string {
  let text = "";
  node.childNodes.forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent || "";
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      text += getAllTextNodes(child as Element);
    }
  });
  return text;
}

// ─── Text Layout Engine for PDF ──────────────────────────────────────

interface TextBlock {
  text: string;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  isHeading: boolean;
  indent: number;
  spacingAfter: number;
  color?: { r: number; g: number; b: number };
  isBullet?: boolean;
}

interface PdfRenderContext {
  doc: PDFDocument;
  fontRegular: PDFFont;
  fontBold: PDFFont;
  fontItalic: PDFFont;
  fontBoldItalic: PDFFont;
  fontMono: PDFFont;
  pageWidth: number;
  pageHeight: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

async function createRenderContext(doc: PDFDocument): Promise<PdfRenderContext> {
  return {
    doc,
    fontRegular: await doc.embedFont(StandardFonts.Helvetica),
    fontBold: await doc.embedFont(StandardFonts.HelveticaBold),
    fontItalic: await doc.embedFont(StandardFonts.HelveticaOblique),
    fontBoldItalic: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
    fontMono: await doc.embedFont(StandardFonts.Courier),
    pageWidth: 612,
    pageHeight: 792,
    marginTop: 60,
    marginBottom: 60,
    marginLeft: 55,
    marginRight: 55,
  };
}

function sanitizeText(text: string): string {
  // Replace characters that standard fonts can't encode
  return text.replace(/[^\x20-\x7E\n\t]/g, char => {
    // Map common unicode to ASCII equivalents
    const map: Record<string, string> = {
      "\u2018": "'", "\u2019": "'", "\u201C": '"', "\u201D": '"',
      "\u2013": "-", "\u2014": "--", "\u2026": "...", "\u00A0": " ",
      "\u2022": "*", "\u2023": ">", "\u2043": "-", "\u25E6": "o",
      "\u00B7": "*", "\u2027": "*", "\u00AB": "<<", "\u00BB": ">>",
      "\u00E9": "e", "\u00E8": "e", "\u00EA": "e", "\u00EB": "e",
      "\u00E0": "a", "\u00E1": "a", "\u00E2": "a", "\u00E3": "a",
      "\u00E4": "a", "\u00E5": "a", "\u00E7": "c", "\u00F1": "n",
      "\u00F2": "o", "\u00F3": "o", "\u00F4": "o", "\u00F5": "o",
      "\u00F6": "o", "\u00F9": "u", "\u00FA": "u", "\u00FB": "u",
      "\u00FC": "u", "\u00ED": "i", "\u00EE": "i", "\u00EF": "i",
      "\u00EC": "i", "\u00FD": "y",
      "\u00C9": "E", "\u00C8": "E", "\u00CA": "E", "\u00CB": "E",
      "\u00D1": "N", "\u00DF": "ss",
      "\u2032": "'", "\u2033": '"', "\u2039": "<", "\u203A": ">",
      "\u201A": ",", "\u201E": '"',
      "\u00AE": "(R)", "\u00A9": "(C)", "\u2122": "(TM)",
      "\u00BD": "1/2", "\u00BC": "1/4", "\u00BE": "3/4",
      "\u00B0": "deg", "\u00B1": "+/-",
    };
    return map[char] || "?";
  });
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const safeText = sanitizeText(text);
  if (!safeText) return [""];

  const words = safeText.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    try {
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    } catch {
      // If measuring fails, just add the word
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [""];
}

function renderTextBlocks(
  blocks: TextBlock[],
  ctx: PdfRenderContext,
  title?: string
): { pages: PDFPage[]; pageItems: PageItem[] } {
  const contentWidth = ctx.pageWidth - ctx.marginLeft - ctx.marginRight;
  const pages: PDFPage[] = [];
  const pageItems: PageItem[] = [];

  let currentPage = ctx.doc.addPage([ctx.pageWidth, ctx.pageHeight]);
  pages.push(currentPage);
  let y = ctx.pageHeight - ctx.marginTop;

  // Draw title header if provided
  if (title) {
    const safeTitle = sanitizeText(title);
    try {
      currentPage.drawText(safeTitle, {
        x: ctx.marginLeft,
        y,
        size: 18,
        font: ctx.fontBold,
        color: rgb(0.1, 0.1, 0.15),
      });
    } catch { /* skip */ }
    y -= 30;

    // Divider line
    currentPage.drawRectangle({
      x: ctx.marginLeft,
      y: y + 2,
      width: contentWidth,
      height: 0.5,
      color: rgb(0.7, 0.7, 0.75),
    });
    y -= 15;
  }

  const addNewPage = () => {
    currentPage = ctx.doc.addPage([ctx.pageWidth, ctx.pageHeight]);
    pages.push(currentPage);
    y = ctx.pageHeight - ctx.marginTop;
  };

  for (const block of blocks) {
    const font = block.isBold && block.isItalic
      ? ctx.fontBoldItalic
      : block.isBold
        ? ctx.fontBold
        : block.isItalic
          ? ctx.fontItalic
          : ctx.fontRegular;

    const effectiveMarginLeft = ctx.marginLeft + block.indent;
    const effectiveWidth = contentWidth - block.indent;
    const lineHeight = block.fontSize * 1.45;

    const displayText = block.isBullet ? `  *  ${block.text}` : block.text;
    const lines = wrapText(displayText, font, block.fontSize, effectiveWidth);

    for (const line of lines) {
      if (y - lineHeight < ctx.marginBottom) {
        addNewPage();
      }

      const color = block.color
        ? rgb(block.color.r, block.color.g, block.color.b)
        : block.isHeading
          ? rgb(0.1, 0.1, 0.15)
          : rgb(0.15, 0.15, 0.2);

      try {
        currentPage.drawText(sanitizeText(line), {
          x: effectiveMarginLeft,
          y,
          size: block.fontSize,
          font,
          color,
        });
      } catch {
        // Skip lines with unrenderable characters
      }

      y -= lineHeight;
    }

    // Spacing after block
    y -= block.spacingAfter;

    if (block.isHeading && block.fontSize >= 14) {
      // Underline for major headings
      currentPage.drawRectangle({
        x: effectiveMarginLeft,
        y: y + block.spacingAfter - 2,
        width: effectiveWidth * 0.3,
        height: 0.5,
        color: rgb(0.8, 0.8, 0.85),
      });
    }
  }

  // Create page items
  for (let i = 0; i < pages.length; i++) {
    pageItems.push({
      id: generateId(),
      fileId: "",
      pageIndex: i,
      rotation: 0,
      selected: false,
      width: ctx.pageWidth,
      height: ctx.pageHeight,
    });
  }

  return { pages, pageItems };
}

// ─── DOCX Converter ─────────────────────────────────────────────────

interface DocxStyle {
  isBold: boolean;
  isItalic: boolean;
  fontSize: number;
  isHeading: boolean;
  headingLevel: number;
}

function parseDocxParagraphStyle(pPr: Element | null, styleName: string): DocxStyle {
  const style: DocxStyle = {
    isBold: false,
    isItalic: false,
    fontSize: 10.5,
    isHeading: false,
    headingLevel: 0,
  };

  // Check paragraph style name for headings
  const headingMatch = styleName.match(/Heading(\d+)/i) || styleName.match(/^h(\d)$/i);
  if (headingMatch) {
    style.isHeading = true;
    style.headingLevel = parseInt(headingMatch[1]);
    style.isBold = true;
    switch (style.headingLevel) {
      case 1: style.fontSize = 20; break;
      case 2: style.fontSize = 16; break;
      case 3: style.fontSize = 13; break;
      default: style.fontSize = 12; break;
    }
  }

  if (styleName.toLowerCase().includes("title")) {
    style.isHeading = true;
    style.fontSize = 24;
    style.isBold = true;
  }

  if (styleName.toLowerCase().includes("subtitle")) {
    style.isHeading = true;
    style.fontSize = 16;
    style.isItalic = true;
  }

  if (pPr) {
    // Check for bold in run properties within paragraph properties
    const rPr = pPr.querySelector("rPr");
    if (rPr) {
      if (rPr.querySelector("b")) style.isBold = true;
      if (rPr.querySelector("i")) style.isItalic = true;
      const sz = rPr.querySelector("sz");
      if (sz) {
        const val = sz.getAttribute("w:val") || sz.getAttribute("val");
        if (val) style.fontSize = parseInt(val) / 2;
      }
    }
  }

  return style;
}

export async function convertDocxToPdf(file: File): Promise<{ pageCount: number; pages: PageItem[]; pdfData: Uint8Array }> {
  const buffer = await file.arrayBuffer();
  const xmlStr = await readZipFileAsText(buffer, "word/document.xml");
  if (!xmlStr) throw new Error("Invalid DOCX: could not find word/document.xml");

  // Also try to read styles
  const stylesXml = await readZipFileAsText(buffer, "word/styles.xml");

  const doc = parseXml(xmlStr);
  const body = doc.querySelector("body") || doc.documentElement;

  // Extract paragraphs
  const paragraphs = body.querySelectorAll("p");
  const textBlocks: TextBlock[] = [];

  paragraphs.forEach(p => {
    // Get paragraph properties
    const pPr = p.querySelector("pPr");
    let styleName = "";
    if (pPr) {
      const pStyle = pPr.querySelector("pStyle");
      styleName = pStyle?.getAttribute("w:val") || pStyle?.getAttribute("val") || "";
    }

    const pStyle = parseDocxParagraphStyle(pPr, styleName);

    // Check for list/numbering
    const numPr = pPr?.querySelector("numPr");
    const isList = !!numPr;

    // Get indent
    const ind = pPr?.querySelector("ind");
    let indent = 0;
    if (ind) {
      const left = ind.getAttribute("w:left") || ind.getAttribute("left");
      if (left) indent = Math.min(parseInt(left) / 20, 100); // twips to points, capped
    }
    if (isList) indent = Math.max(indent, 20);

    // Extract all text runs
    const runs = p.querySelectorAll("r");
    let paragraphText = "";
    let hasRunBold = false;
    let hasRunItalic = false;
    let runFontSize = 0;

    runs.forEach(r => {
      const rPr = r.querySelector("rPr");
      if (rPr) {
        if (rPr.querySelector("b")) hasRunBold = true;
        if (rPr.querySelector("i")) hasRunItalic = true;
        const sz = rPr.querySelector("sz");
        if (sz) {
          const val = sz.getAttribute("w:val") || sz.getAttribute("val");
          if (val) runFontSize = parseInt(val) / 2;
        }
      }

      const t = r.querySelector("t");
      if (t) {
        paragraphText += t.textContent || "";
      }

      // Handle tabs and breaks
      if (r.querySelector("tab")) paragraphText += "    ";
      if (r.querySelector("br")) paragraphText += "\n";
    });

    // Handle paragraph breaks with no runs
    if (runs.length === 0) {
      paragraphText = getAllTextNodes(p).trim();
    }

    if (!paragraphText.trim() && !pStyle.isHeading) {
      // Empty paragraph = spacing
      textBlocks.push({
        text: "",
        fontSize: 10.5,
        isBold: false,
        isItalic: false,
        isHeading: false,
        indent: 0,
        spacingAfter: 6,
      });
      return;
    }

    if (paragraphText.trim()) {
      textBlocks.push({
        text: paragraphText,
        fontSize: runFontSize || pStyle.fontSize,
        isBold: pStyle.isBold || hasRunBold,
        isItalic: pStyle.isItalic || hasRunItalic,
        isHeading: pStyle.isHeading,
        indent: indent,
        spacingAfter: pStyle.isHeading ? 8 : 4,
        isBullet: isList,
      });
    }
  });

  if (textBlocks.length === 0) {
    textBlocks.push({
      text: "(This document appears to be empty or contains only images/objects that cannot be rendered as text.)",
      fontSize: 11,
      isBold: false,
      isItalic: true,
      isHeading: false,
      indent: 0,
      spacingAfter: 4,
      color: { r: 0.5, g: 0.5, b: 0.5 },
    });
  }

  const pdfDoc = await PDFDocument.create();
  const ctx = await createRenderContext(pdfDoc);
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const { pages, pageItems } = renderTextBlocks(textBlocks, ctx, baseName);

  const pdfData = await pdfDoc.save();
  return { pageCount: pages.length, pages: pageItems, pdfData };
}

// ─── PPTX Converter ─────────────────────────────────────────────────

export async function convertPptxToPdf(file: File): Promise<{ pageCount: number; pages: PageItem[]; pdfData: Uint8Array }> {
  const buffer = await file.arrayBuffer();
  const allFiles = await listZipFiles(buffer);

  // Find slide files
  const slideFiles = allFiles
    .filter(f => /^ppt\/slides\/slide\d+\.xml$/i.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/i)?.[1] || "0");
      const numB = parseInt(b.match(/slide(\d+)/i)?.[1] || "0");
      return numA - numB;
    });

  if (slideFiles.length === 0) {
    throw new Error("Invalid PPTX: no slides found");
  }

  const pdfDoc = await PDFDocument.create();
  const ctx = await createRenderContext(pdfDoc);

  // Use landscape for slides
  const slideWidth = 792;
  const slideHeight = 612;
  const marginH = 50;
  const marginV = 50;
  const contentWidth = slideWidth - marginH * 2;

  const pageItems: PageItem[] = [];

  for (let slideIdx = 0; slideIdx < slideFiles.length; slideIdx++) {
    const xmlStr = await readZipFileAsText(buffer, slideFiles[slideIdx]);
    if (!xmlStr) continue;

    const doc = parseXml(xmlStr);
    const page = pdfDoc.addPage([slideWidth, slideHeight]);

    // Slide background - light gradient feel
    page.drawRectangle({
      x: 0, y: 0,
      width: slideWidth, height: slideHeight,
      color: rgb(1, 1, 1),
    });

    // Slide border
    page.drawRectangle({
      x: 4, y: 4,
      width: slideWidth - 8, height: slideHeight - 8,
      borderColor: rgb(0.88, 0.88, 0.9),
      borderWidth: 0.5,
      color: rgb(0.995, 0.995, 1),
    });

    // Extract text content from shapes
    // PPTX uses namespaces: a: (drawingML), p: (presentationML)
    const textBodies = doc.querySelectorAll("txBody");
    let y = slideHeight - marginV;
    let isFirstTitle = true;

    textBodies.forEach(txBody => {
      const paragraphs = txBody.querySelectorAll("p");

      paragraphs.forEach(p => {
        // Check for paragraph properties
        const pPr = p.querySelector("pPr");
        const lvl = pPr?.getAttribute("lvl");
        const level = lvl ? parseInt(lvl) : 0;

        // Determine if this is a title placeholder
        const parent = txBody.parentElement;
        const nvSpPr = parent?.querySelector("nvSpPr");
        const phEl = nvSpPr?.querySelector("ph");
        const phType = phEl?.getAttribute("type") || "";
        const isTitle = phType === "title" || phType === "ctrTitle";
        const isSubtitle = phType === "subTitle";

        // Extract runs
        const runs = p.querySelectorAll("r");
        let paraText = "";
        let isBold = false;
        let isItalic = false;
        let fontSize = 10;

        runs.forEach(r => {
          const rPr = r.querySelector("rPr");
          if (rPr) {
            if (rPr.getAttribute("b") === "1") isBold = true;
            if (rPr.getAttribute("i") === "1") isItalic = true;
            const sz = rPr.getAttribute("sz");
            if (sz) fontSize = parseInt(sz) / 100; // hundredths of a point
          }
          const t = r.querySelector("t");
          if (t) paraText += t.textContent || "";
        });

        // Also get plain text content if no runs
        if (!paraText) {
          paraText = getAllTextNodes(p).trim();
        }

        if (!paraText.trim()) {
          y -= 8;
          return;
        }

        // Style based on type
        let drawFontSize: number;
        let font: PDFFont;
        let color = rgb(0.15, 0.15, 0.2);

        if (isTitle && isFirstTitle) {
          drawFontSize = Math.min(fontSize || 28, 32);
          font = ctx.fontBold;
          color = rgb(0.1, 0.1, 0.15);
          isFirstTitle = false;
        } else if (isSubtitle) {
          drawFontSize = Math.min(fontSize || 18, 22);
          font = ctx.fontItalic;
          color = rgb(0.35, 0.35, 0.4);
        } else {
          drawFontSize = Math.min(fontSize || 12, 20);
          font = (isBold && isItalic) ? ctx.fontBoldItalic : isBold ? ctx.fontBold : isItalic ? ctx.fontItalic : ctx.fontRegular;
        }

        const indent = level * 25 + marginH;
        const lineHeight = drawFontSize * 1.4;
        const safeText = sanitizeText(paraText);
        const lines = wrapText(safeText, font, drawFontSize, contentWidth - level * 25);

        for (const line of lines) {
          if (y < marginV + 20) break;
          try {
            page.drawText(sanitizeText(line), {
              x: indent,
              y,
              size: drawFontSize,
              font,
              color,
            });
          } catch { /* skip */ }
          y -= lineHeight;
        }
        y -= 4;
      });

      y -= 8; // Space between text bodies (shapes)
    });

    // Slide number
    const slideNumText = `Slide ${slideIdx + 1} of ${slideFiles.length}`;
    try {
      page.drawText(slideNumText, {
        x: slideWidth - marginH - ctx.fontRegular.widthOfTextAtSize(slideNumText, 8),
        y: 20,
        size: 8,
        font: ctx.fontRegular,
        color: rgb(0.6, 0.6, 0.65),
      });
    } catch { /* skip */ }

    pageItems.push({
      id: generateId(),
      fileId: "",
      pageIndex: slideIdx,
      rotation: 0,
      selected: false,
      width: slideWidth,
      height: slideHeight,
    });
  }

  const pdfData = await pdfDoc.save();
  return { pageCount: slideFiles.length, pages: pageItems, pdfData };
}

// ─── XLSX/CSV Converter ──────────────────────────────────────────────

interface CellData {
  row: number;
  col: number;
  value: string;
  type: string;
}

export async function convertXlsxToPdf(file: File): Promise<{ pageCount: number; pages: PageItem[]; pdfData: Uint8Array }> {
  const buffer = await file.arrayBuffer();

  // Read shared strings
  const sharedStringsXml = await readZipFileAsText(buffer, "xl/sharedStrings.xml");
  const sharedStrings: string[] = [];
  if (sharedStringsXml) {
    const ssDoc = parseXml(sharedStringsXml);
    const siElements = ssDoc.querySelectorAll("si");
    siElements.forEach(si => {
      sharedStrings.push(getAllTextNodes(si).trim());
    });
  }

  // Find and read worksheets
  const allFiles = await listZipFiles(buffer);
  const sheetFiles = allFiles
    .filter(f => /^xl\/worksheets\/sheet\d+\.xml$/i.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/sheet(\d+)/i)?.[1] || "0");
      const numB = parseInt(b.match(/sheet(\d+)/i)?.[1] || "0");
      return numA - numB;
    });

  // Also try to get sheet names from workbook.xml
  const workbookXml = await readZipFileAsText(buffer, "xl/workbook.xml");
  const sheetNames: string[] = [];
  if (workbookXml) {
    const wbDoc = parseXml(workbookXml);
    wbDoc.querySelectorAll("sheet").forEach(s => {
      sheetNames.push(s.getAttribute("name") || "Sheet");
    });
  }

  const pdfDoc = await PDFDocument.create();
  const ctx = await createRenderContext(pdfDoc);

  // Use landscape for spreadsheets
  const pgWidth = 792;
  const pgHeight = 612;
  const margin = 45;

  const pageItems: PageItem[] = [];
  let pageIndex = 0;

  for (let sheetIdx = 0; sheetIdx < Math.max(sheetFiles.length, 1); sheetIdx++) {
    const xmlStr = sheetFiles[sheetIdx]
      ? await readZipFileAsText(buffer, sheetFiles[sheetIdx])
      : null;

    if (!xmlStr) continue;

    const sheetDoc = parseXml(xmlStr);
    const rows = sheetDoc.querySelectorAll("row");
    const cells: CellData[][] = [];
    let maxCol = 0;

    rows.forEach(row => {
      const rowNum = parseInt(row.getAttribute("r") || "0");
      const rowCells: CellData[] = [];

      row.querySelectorAll("c").forEach(c => {
        const ref = c.getAttribute("r") || "";
        const colLetter = ref.replace(/\d+/g, "");
        const col = colLetterToIndex(colLetter);
        maxCol = Math.max(maxCol, col);

        const type = c.getAttribute("t") || "";
        const vEl = c.querySelector("v");
        let value = vEl?.textContent || "";

        // Resolve shared string references
        if (type === "s" && vEl?.textContent) {
          const idx = parseInt(vEl.textContent);
          if (idx >= 0 && idx < sharedStrings.length) {
            value = sharedStrings[idx];
          }
        }

        // Inline string
        if (type === "inlineStr") {
          const is = c.querySelector("is");
          if (is) value = getAllTextNodes(is).trim();
        }

        rowCells.push({ row: rowNum, col, value, type });
      });

      cells.push(rowCells);
    });

    if (cells.length === 0) continue;

    // Calculate column widths
    const numCols = maxCol + 1;
    const availWidth = pgWidth - margin * 2;
    const colWidth = Math.min(Math.max(availWidth / Math.max(numCols, 1), 40), 150);
    const fontSize = Math.min(8.5, numCols <= 5 ? 10 : numCols <= 10 ? 8.5 : 7);
    const rowHeight = fontSize * 2.2;
    const maxColsPerPage = Math.floor(availWidth / colWidth);

    // Render table pages
    let startCol = 0;
    while (startCol < numCols) {
      const endCol = Math.min(startCol + maxColsPerPage, numCols);
      let rowStart = 0;
      const rowsPerPage = Math.floor((pgHeight - margin * 2 - 30) / rowHeight);

      while (rowStart < cells.length) {
        const page = pdfDoc.addPage([pgWidth, pgHeight]);
        let y = pgHeight - margin;

        // Sheet header
        const sheetName = sheetNames[sheetIdx] || `Sheet ${sheetIdx + 1}`;
        try {
          page.drawText(sanitizeText(sheetName), {
            x: margin,
            y,
            size: 13,
            font: ctx.fontBold,
            color: rgb(0.1, 0.1, 0.15),
          });
        } catch { /* skip */ }
        y -= 22;

        // Table header line
        page.drawRectangle({
          x: margin - 2,
          y: y - 2,
          width: (endCol - startCol) * colWidth + 4,
          height: 1,
          color: rgb(0.75, 0.75, 0.8),
        });

        const rowEnd = Math.min(rowStart + rowsPerPage, cells.length);

        for (let ri = rowStart; ri < rowEnd; ri++) {
          const row = cells[ri];
          if (!row) continue;

          // Alternate row background
          if (ri % 2 === 0) {
            page.drawRectangle({
              x: margin - 2,
              y: y - rowHeight + 4,
              width: (endCol - startCol) * colWidth + 4,
              height: rowHeight,
              color: rgb(0.97, 0.97, 0.98),
            });
          }

          for (const cell of row) {
            if (cell.col < startCol || cell.col >= endCol) continue;
            const x = margin + (cell.col - startCol) * colWidth;

            const displayVal = cell.value.substring(0, Math.floor(colWidth / (fontSize * 0.5)));
            try {
              page.drawText(sanitizeText(displayVal), {
                x: x + 3,
                y: y - fontSize,
                size: fontSize,
                font: ri === 0 ? ctx.fontBold : ctx.fontRegular,
                color: ri === 0 ? rgb(0.1, 0.1, 0.15) : rgb(0.2, 0.2, 0.25),
              });
            } catch { /* skip */ }
          }

          y -= rowHeight;

          // Row bottom border (thin)
          page.drawRectangle({
            x: margin - 2,
            y: y + rowHeight - 2,
            width: (endCol - startCol) * colWidth + 4,
            height: 0.3,
            color: rgb(0.88, 0.88, 0.9),
          });

          if (y < margin + 20) break;
        }

        // Column dividers
        for (let ci = startCol; ci <= endCol; ci++) {
          const x = margin + (ci - startCol) * colWidth - 2;
          page.drawRectangle({
            x,
            y: y,
            width: 0.3,
            height: pgHeight - margin - y - 22,
            color: rgb(0.88, 0.88, 0.9),
          });
        }

        pageItems.push({
          id: generateId(),
          fileId: "",
          pageIndex: pageIndex++,
          rotation: 0,
          selected: false,
          width: pgWidth,
          height: pgHeight,
        });

        rowStart = rowEnd;
      }

      startCol = endCol;
    }
  }

  if (pageItems.length === 0) {
    // Empty workbook
    const page = pdfDoc.addPage([pgWidth, pgHeight]);
    try {
      page.drawText(sanitizeText(file.name), {
        x: margin, y: pgHeight - margin,
        size: 14, font: ctx.fontBold, color: rgb(0.2, 0.2, 0.2),
      });
      page.drawText("(Empty spreadsheet - no data found)", {
        x: margin, y: pgHeight - margin - 30,
        size: 11, font: ctx.fontItalic, color: rgb(0.5, 0.5, 0.5),
      });
    } catch { /* skip */ }
    pageItems.push({
      id: generateId(), fileId: "", pageIndex: 0,
      rotation: 0, selected: false, width: pgWidth, height: pgHeight,
    });
  }

  const pdfData = await pdfDoc.save();
  return { pageCount: pageItems.length, pages: pageItems, pdfData };
}

function colLetterToIndex(letters: string): number {
  let result = 0;
  for (let i = 0; i < letters.length; i++) {
    result = result * 26 + (letters.charCodeAt(i) - 64);
  }
  return result - 1;
}

// ─── CSV/TSV Converter ──────────────────────────────────────────────

export async function convertCsvToPdf(file: File): Promise<{ pageCount: number; pages: PageItem[]; pdfData: Uint8Array }> {
  const text = await file.text();
  const ext = file.name.split(".").pop()?.toLowerCase();
  const separator = ext === "tsv" ? "\t" : ",";

  const rows = parseCsv(text, separator);
  if (rows.length === 0) {
    throw new Error("Empty CSV file");
  }

  const pdfDoc = await PDFDocument.create();
  const ctx = await createRenderContext(pdfDoc);

  const pgWidth = 792; // landscape
  const pgHeight = 612;
  const margin = 45;
  const availWidth = pgWidth - margin * 2;
  const numCols = Math.max(...rows.map(r => r.length));
  const colWidth = Math.min(Math.max(availWidth / numCols, 50), 140);
  const fontSize = numCols <= 5 ? 9.5 : numCols <= 8 ? 8 : 7;
  const rowHeight = fontSize * 2.4;
  const rowsPerPage = Math.floor((pgHeight - margin * 2 - 30) / rowHeight);
  const pageItems: PageItem[] = [];
  let pageIndex = 0;

  for (let rowStart = 0; rowStart < rows.length; rowStart += rowsPerPage) {
    const page = pdfDoc.addPage([pgWidth, pgHeight]);
    let y = pgHeight - margin;

    // File name header
    if (rowStart === 0) {
      try {
        page.drawText(sanitizeText(file.name), {
          x: margin, y, size: 13, font: ctx.fontBold, color: rgb(0.1, 0.1, 0.15),
        });
      } catch { /* skip */ }
      y -= 22;
    }

    const rowEnd = Math.min(rowStart + rowsPerPage, rows.length);
    for (let ri = rowStart; ri < rowEnd; ri++) {
      const row = rows[ri];

      // Alternate row coloring
      if ((ri - rowStart) % 2 === 0) {
        page.drawRectangle({
          x: margin - 2, y: y - rowHeight + 4,
          width: Math.min(numCols * colWidth, availWidth) + 4,
          height: rowHeight,
          color: rgb(0.97, 0.97, 0.98),
        });
      }

      for (let ci = 0; ci < row.length; ci++) {
        const x = margin + ci * colWidth;
        if (x > pgWidth - margin) break;
        const maxChars = Math.floor(colWidth / (fontSize * 0.5));
        const val = row[ci].substring(0, maxChars);
        try {
          page.drawText(sanitizeText(val), {
            x: x + 3, y: y - fontSize,
            size: fontSize,
            font: ri === 0 ? ctx.fontBold : ctx.fontRegular,
            color: ri === 0 ? rgb(0.1, 0.1, 0.15) : rgb(0.2, 0.2, 0.25),
          });
        } catch { /* skip */ }
      }
      y -= rowHeight;
    }

    pageItems.push({
      id: generateId(), fileId: "", pageIndex: pageIndex++,
      rotation: 0, selected: false, width: pgWidth, height: pgHeight,
    });
  }

  const pdfData = await pdfDoc.save();
  return { pageCount: pageItems.length, pages: pageItems, pdfData };
}

function parseCsv(text: string, sep: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === sep) {
          cells.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    cells.push(current.trim());
    rows.push(cells);
  }

  return rows;
}

// ─── HTML Converter ─────────────────────────────────────────────────

export async function convertHtmlToPdf(file: File): Promise<{ pageCount: number; pages: PageItem[]; pdfData: Uint8Array }> {
  const html = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const textBlocks: TextBlock[] = [];
  const title = doc.querySelector("title")?.textContent || file.name.replace(/\.[^.]+$/, "");

  function walkNodes(node: Node, depth: number = 0) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        textBlocks.push({
          text,
          fontSize: 10.5,
          isBold: false,
          isItalic: false,
          isHeading: false,
          indent: Math.min(depth * 10, 60),
          spacingAfter: 2,
        });
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // Skip invisible elements
    if (["script", "style", "noscript", "meta", "link", "head"].includes(tag)) return;

    const text = el.textContent?.trim();
    if (!text) return;

    // Handle different element types
    switch (tag) {
      case "h1":
        textBlocks.push({ text, fontSize: 20, isBold: true, isItalic: false, isHeading: true, indent: 0, spacingAfter: 10 });
        return;
      case "h2":
        textBlocks.push({ text, fontSize: 16, isBold: true, isItalic: false, isHeading: true, indent: 0, spacingAfter: 8 });
        return;
      case "h3":
        textBlocks.push({ text, fontSize: 13.5, isBold: true, isItalic: false, isHeading: true, indent: 0, spacingAfter: 6 });
        return;
      case "h4":
      case "h5":
      case "h6":
        textBlocks.push({ text, fontSize: 12, isBold: true, isItalic: false, isHeading: true, indent: 0, spacingAfter: 5 });
        return;
      case "p":
      case "div":
      case "section":
      case "article":
        // Process children recursively for mixed content
        if (el.children.length > 0) {
          el.childNodes.forEach(child => walkNodes(child, depth));
          textBlocks.push({ text: "", fontSize: 10.5, isBold: false, isItalic: false, isHeading: false, indent: 0, spacingAfter: 6 });
        } else {
          textBlocks.push({ text, fontSize: 10.5, isBold: false, isItalic: false, isHeading: false, indent: 0, spacingAfter: 4 });
        }
        return;
      case "li":
        textBlocks.push({
          text, fontSize: 10.5, isBold: false, isItalic: false,
          isHeading: false, indent: 20, spacingAfter: 3, isBullet: true,
        });
        return;
      case "blockquote":
        textBlocks.push({
          text, fontSize: 10.5, isBold: false, isItalic: true,
          isHeading: false, indent: 30, spacingAfter: 6,
          color: { r: 0.35, g: 0.35, b: 0.4 },
        });
        return;
      case "pre":
      case "code":
        textBlocks.push({
          text, fontSize: 9, isBold: false, isItalic: false,
          isHeading: false, indent: 10, spacingAfter: 6,
          color: { r: 0.3, g: 0.3, b: 0.35 },
        });
        return;
      case "strong":
      case "b":
        textBlocks.push({ text, fontSize: 10.5, isBold: true, isItalic: false, isHeading: false, indent: 0, spacingAfter: 2 });
        return;
      case "em":
      case "i":
        textBlocks.push({ text, fontSize: 10.5, isBold: false, isItalic: true, isHeading: false, indent: 0, spacingAfter: 2 });
        return;
      case "table":
        // Simple table handling: extract rows as text
        const trs = el.querySelectorAll("tr");
        trs.forEach((tr, i) => {
          const cells: string[] = [];
          tr.querySelectorAll("td, th").forEach(cell => {
            cells.push(cell.textContent?.trim() || "");
          });
          textBlocks.push({
            text: cells.join("  |  "),
            fontSize: 9.5,
            isBold: i === 0,
            isItalic: false,
            isHeading: false,
            indent: 5,
            spacingAfter: 2,
          });
        });
        return;
      default:
        // For other elements, recurse into children
        el.childNodes.forEach(child => walkNodes(child, depth));
    }
  }

  const body = doc.body || doc.documentElement;
  body.childNodes.forEach(child => walkNodes(child));

  if (textBlocks.length === 0) {
    textBlocks.push({
      text: "(Empty HTML document)",
      fontSize: 11, isBold: false, isItalic: true,
      isHeading: false, indent: 0, spacingAfter: 4,
      color: { r: 0.5, g: 0.5, b: 0.5 },
    });
  }

  const pdfDoc = await PDFDocument.create();
  const ctx = await createRenderContext(pdfDoc);
  const { pages, pageItems } = renderTextBlocks(textBlocks, ctx, title);

  const pdfData = await pdfDoc.save();
  return { pageCount: pages.length, pages: pageItems, pdfData };
}

// ─── RTF Converter ──────────────────────────────────────────────────

export async function convertRtfToPdf(file: File): Promise<{ pageCount: number; pages: PageItem[]; pdfData: Uint8Array }> {
  const text = await file.text();

  // Simple RTF parser - extract text content
  const textBlocks: TextBlock[] = [];
  let current = "";
  let isBold = false;
  let isItalic = false;
  let skipGroup = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === "{") {
      // Check for groups to skip (headers, fonttbl, etc.)
      const ahead = text.substring(i + 1, i + 20);
      if (ahead.startsWith("\\fonttbl") || ahead.startsWith("\\colortbl") ||
          ahead.startsWith("\\stylesheet") || ahead.startsWith("\\info") ||
          ahead.startsWith("\\*")) {
        skipGroup++;
        continue;
      }
      if (skipGroup > 0) skipGroup++;
      continue;
    }

    if (ch === "}") {
      if (skipGroup > 0) skipGroup--;
      continue;
    }

    if (skipGroup > 0) continue;

    if (ch === "\\") {
      // Control word
      let word = "";
      let j = i + 1;
      while (j < text.length && /[a-zA-Z]/.test(text[j])) {
        word += text[j];
        j++;
      }

      // Skip numeric parameter
      let param = "";
      while (j < text.length && /[-\d]/.test(text[j])) {
        param += text[j];
        j++;
      }

      // Skip trailing space
      if (j < text.length && text[j] === " ") j++;

      switch (word) {
        case "par":
        case "line":
          if (current.trim()) {
            textBlocks.push({
              text: current.trim(),
              fontSize: 10.5,
              isBold,
              isItalic,
              isHeading: false,
              indent: 0,
              spacingAfter: 4,
            });
          }
          current = "";
          break;
        case "b":
          isBold = param !== "0";
          break;
        case "i":
          isItalic = param !== "0";
          break;
        case "tab":
          current += "    ";
          break;
      }

      i = j - 1;
      continue;
    }

    current += ch;
  }

  if (current.trim()) {
    textBlocks.push({
      text: current.trim(),
      fontSize: 10.5,
      isBold,
      isItalic,
      isHeading: false,
      indent: 0,
      spacingAfter: 4,
    });
  }

  if (textBlocks.length === 0) {
    textBlocks.push({
      text: "(No readable text content found in RTF file)",
      fontSize: 11, isBold: false, isItalic: true,
      isHeading: false, indent: 0, spacingAfter: 4,
      color: { r: 0.5, g: 0.5, b: 0.5 },
    });
  }

  const pdfDoc = await PDFDocument.create();
  const ctx = await createRenderContext(pdfDoc);
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const { pages, pageItems } = renderTextBlocks(textBlocks, ctx, baseName);

  const pdfData = await pdfDoc.save();
  return { pageCount: pages.length, pages: pageItems, pdfData };
}

// ─── Markdown Converter (enhanced) ──────────────────────────────────

export async function convertMarkdownToPdf(file: File): Promise<{ pageCount: number; pages: PageItem[]; pdfData: Uint8Array }> {
  const text = await file.text();
  const lines = text.split("\n");
  const textBlocks: TextBlock[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Code blocks
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) {
      textBlocks.push({
        text: line, // preserve whitespace in code
        fontSize: 9,
        isBold: false,
        isItalic: false,
        isHeading: false,
        indent: 15,
        spacingAfter: 1,
        color: { r: 0.25, g: 0.3, b: 0.35 },
      });
      continue;
    }

    // Empty lines
    if (!trimmed) {
      textBlocks.push({
        text: "", fontSize: 10.5, isBold: false, isItalic: false,
        isHeading: false, indent: 0, spacingAfter: 4,
      });
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].replace(/\*\*/g, "").replace(/\*/g, "");
      const sizeMap: Record<number, number> = { 1: 22, 2: 18, 3: 15, 4: 13, 5: 12, 6: 11.5 };
      textBlocks.push({
        text: headingText,
        fontSize: sizeMap[level] || 12,
        isBold: true,
        isItalic: false,
        isHeading: true,
        indent: 0,
        spacingAfter: level <= 2 ? 10 : 6,
      });
      continue;
    }

    // Horizontal rules
    if (/^[-*_]{3,}$/.test(trimmed)) {
      textBlocks.push({
        text: "________________________________________",
        fontSize: 8,
        isBold: false,
        isItalic: false,
        isHeading: false,
        indent: 0,
        spacingAfter: 8,
        color: { r: 0.7, g: 0.7, b: 0.75 },
      });
      continue;
    }

    // List items
    const listMatch = trimmed.match(/^[-*+]\s+(.+)/) || trimmed.match(/^\d+\.\s+(.+)/);
    if (listMatch) {
      const content = listMatch[1].replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
      textBlocks.push({
        text: content,
        fontSize: 10.5,
        isBold: false,
        isItalic: false,
        isHeading: false,
        indent: 20,
        spacingAfter: 3,
        isBullet: true,
      });
      continue;
    }

    // Blockquotes
    if (trimmed.startsWith(">")) {
      const quoteText = trimmed.replace(/^>\s*/, "").replace(/\*\*(.+?)\*\*/g, "$1");
      textBlocks.push({
        text: quoteText,
        fontSize: 10.5,
        isBold: false,
        isItalic: true,
        isHeading: false,
        indent: 25,
        spacingAfter: 4,
        color: { r: 0.35, g: 0.35, b: 0.4 },
      });
      continue;
    }

    // Regular paragraph - handle inline formatting
    let paraText = trimmed;
    let paraBold = false;
    let paraItalic = false;

    // Detect if entire line is bold or italic
    if (/^\*\*(.+)\*\*$/.test(paraText)) {
      paraText = paraText.slice(2, -2);
      paraBold = true;
    } else if (/^\*(.+)\*$/.test(paraText)) {
      paraText = paraText.slice(1, -1);
      paraItalic = true;
    }

    // Strip remaining inline markers
    paraText = paraText
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1"); // links

    textBlocks.push({
      text: paraText,
      fontSize: 10.5,
      isBold: paraBold,
      isItalic: paraItalic,
      isHeading: false,
      indent: 0,
      spacingAfter: 4,
    });
  }

  const pdfDoc = await PDFDocument.create();
  const ctx = await createRenderContext(pdfDoc);
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const { pages, pageItems } = renderTextBlocks(textBlocks, ctx, baseName);

  const pdfData = await pdfDoc.save();
  return { pageCount: pages.length, pages: pageItems, pdfData };
}

// ─── Generic Unsupported Format Converter ─────────────────────────────

export async function convertUnsupportedToPdf(file: File, category: string): Promise<{ pageCount: number; pages: PageItem[]; pdfData: Uint8Array }> {
  const pdfDoc = await PDFDocument.create();
  const ctx = await createRenderContext(pdfDoc);
  const page = pdfDoc.addPage([ctx.pageWidth, ctx.pageHeight]);

  const ext = file.name.split(".").pop()?.toLowerCase() || "unknown";
  const sizeKB = (file.size / 1024).toFixed(1);
  const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
  const sizeDisplay = file.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

  let y = ctx.pageHeight - ctx.marginTop;

  // Header bar
  page.drawRectangle({
    x: 0, y: y - 10,
    width: ctx.pageWidth, height: 70,
    color: rgb(0.12, 0.14, 0.2),
  });

  try {
    page.drawText(sanitizeText(file.name), {
      x: ctx.marginLeft, y: y + 25,
      size: 17, font: ctx.fontBold, color: rgb(1, 1, 1),
    });
    page.drawText(`${ext.toUpperCase()} file  |  ${sizeDisplay}  |  ${category}`, {
      x: ctx.marginLeft, y: y + 5,
      size: 10, font: ctx.fontRegular, color: rgb(0.7, 0.75, 0.85),
    });
  } catch { /* skip */ }

  y -= 50;

  // Info box
  page.drawRectangle({
    x: ctx.marginLeft, y: y - 120,
    width: ctx.pageWidth - ctx.marginLeft * 2, height: 120,
    color: rgb(0.96, 0.97, 0.99),
    borderColor: rgb(0.85, 0.87, 0.92),
    borderWidth: 1,
  });

  const infoLines = [
    `This is a client-side conversion of "${file.name}".`,
    "",
    `The .${ext} format requires specialized rendering that is not fully`,
    `supported in the browser. The file metadata has been preserved.`,
    "",
    `For full-fidelity conversion, use a dedicated desktop application`,
    `such as LibreOffice or the original editing software.`,
  ];

  let infoY = y - 18;
  for (const line of infoLines) {
    if (!line) { infoY -= 8; continue; }
    try {
      page.drawText(sanitizeText(line), {
        x: ctx.marginLeft + 15, y: infoY,
        size: 10, font: ctx.fontRegular,
        color: rgb(0.3, 0.32, 0.38),
      });
    } catch { /* skip */ }
    infoY -= 16;
  }

  y -= 150;

  // File details section
  try {
    page.drawText("File Details", {
      x: ctx.marginLeft, y,
      size: 13, font: ctx.fontBold, color: rgb(0.15, 0.15, 0.2),
    });
  } catch { /* skip */ }
  y -= 25;

  const details = [
    ["File Name:", file.name],
    ["File Type:", `.${ext} (${category})`],
    ["File Size:", sizeDisplay],
    ["Last Modified:", new Date(file.lastModified).toLocaleString()],
    ["Conversion Date:", new Date().toLocaleString()],
    ["Conversion Method:", "Client-side (browser)"],
  ];

  for (const [label, value] of details) {
    try {
      page.drawText(sanitizeText(label), {
        x: ctx.marginLeft + 10, y,
        size: 10, font: ctx.fontBold, color: rgb(0.3, 0.3, 0.35),
      });
      page.drawText(sanitizeText(value), {
        x: ctx.marginLeft + 140, y,
        size: 10, font: ctx.fontRegular, color: rgb(0.2, 0.2, 0.25),
      });
    } catch { /* skip */ }
    y -= 20;
  }

  // Try to extract any text content
  try {
    const rawText = await file.text();
    if (rawText && rawText.length > 0) {
      y -= 20;
      try {
        page.drawText("Extracted Text Content:", {
          x: ctx.marginLeft, y,
          size: 13, font: ctx.fontBold, color: rgb(0.15, 0.15, 0.2),
        });
      } catch { /* skip */ }
      y -= 20;

      page.drawRectangle({
        x: ctx.marginLeft, y: ctx.marginBottom,
        width: ctx.pageWidth - ctx.marginLeft * 2,
        height: y - ctx.marginBottom,
        color: rgb(0.98, 0.98, 0.99),
        borderColor: rgb(0.9, 0.9, 0.92),
        borderWidth: 0.5,
      });

      // Show first portion of readable text (filter non-printable)
      const readable = rawText
        .replace(/[^\x20-\x7E\n\t]/g, "")
        .split("\n")
        .filter(l => l.trim().length > 2)
        .slice(0, 25);

      for (const line of readable) {
        if (y < ctx.marginBottom + 15) break;
        const truncated = line.substring(0, 85);
        try {
          page.drawText(sanitizeText(truncated), {
            x: ctx.marginLeft + 10, y,
            size: 8.5, font: ctx.fontMono, color: rgb(0.3, 0.3, 0.35),
          });
        } catch { /* skip */ }
        y -= 12;
      }
    }
  } catch {
    // Binary file - can't extract text
  }

  const pdfData = await pdfDoc.save();
  return {
    pageCount: 1,
    pages: [{
      id: generateId(), fileId: "", pageIndex: 0,
      rotation: 0, selected: false,
      width: ctx.pageWidth, height: ctx.pageHeight,
    }],
    pdfData,
  };
}

// ─── Master Convert Function ────────────────────────────────────────

export async function convertFileToPdf(
  file: File,
  ext: string,
  category: string
): Promise<{ pageCount: number; pages: PageItem[]; pdfData: Uint8Array }> {
  switch (ext) {
    case "docx":
    case "odt":
      return convertDocxToPdf(file);

    case "pptx":
    case "odp":
    case "ppsx":
      return convertPptxToPdf(file);

    case "xlsx":
    case "ods":
      return convertXlsxToPdf(file);

    case "csv":
    case "tsv":
      return convertCsvToPdf(file);

    case "html":
    case "htm":
    case "mht":
    case "mhtml":
    case "xml":
      return convertHtmlToPdf(file);

    case "rtf":
      return convertRtfToPdf(file);

    case "md":
    case "markdown":
      return convertMarkdownToPdf(file);

    // Legacy binary formats - these can't be parsed as ZIP in the browser
    case "doc":
    case "ppt":
    case "pps":
    case "xls":
      return convertUnsupportedToPdf(file, `${category} (Legacy binary format - use .${ext}x for full conversion)`);

    default:
      return convertUnsupportedToPdf(file, category);
  }
}