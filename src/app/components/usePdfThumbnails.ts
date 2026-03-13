import { useState, useEffect, useRef } from "react";

// Load pdf.js via script tag for maximum compatibility
const PDFJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let pdfjsLib: any = null;
let loadingPromise: Promise<any> | null = null;

function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return Promise.resolve(pdfjsLib);
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    // Check if already loaded globally
    if ((window as any).pdfjsLib) {
      pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
      resolve(pdfjsLib);
      return;
    }

    const script = document.createElement("script");
    script.src = PDFJS_CDN;
    script.async = true;
    script.onload = () => {
      pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
        resolve(pdfjsLib);
      } else {
        loadingPromise = null;
        reject(new Error("pdf.js loaded but pdfjsLib not found on window"));
      }
    };
    script.onerror = () => {
      loadingPromise = null;
      reject(new Error("Failed to load pdf.js from CDN"));
    };
    document.head.appendChild(script);
  });

  return loadingPromise;
}

export interface ThumbnailResult {
  thumbnails: Map<number, string>; // pageIndex -> data URL
  isLoading: boolean;
  error: string | null;
  progress: number; // 0-100
}

export function usePdfThumbnails(
  pdfData: Uint8Array | undefined,
  pageCount: number,
  options?: { maxConcurrent?: number; thumbWidth?: number }
): ThumbnailResult {
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const prevDataRef = useRef<Uint8Array | undefined>();

  const thumbWidth = options?.thumbWidth ?? 200;
  const maxConcurrent = options?.maxConcurrent ?? 3;

  useEffect(() => {
    if (!pdfData || pdfData.length === 0) return;
    // Skip if same data reference
    if (pdfData === prevDataRef.current) return;
    prevDataRef.current = pdfData;

    let isCancelled = false;

    setThumbnails(new Map());
    setIsLoading(true);
    setError(null);
    setProgress(0);

    (async () => {
      try {
        const lib = await loadPdfJs();
        if (isCancelled) return;

        // pdf.js getDocument expects a copy of the data
        const dataCopy = pdfData.slice();
        const loadingTask = lib.getDocument({ data: dataCopy });
        const pdfDoc = await loadingTask.promise;
        if (isCancelled) return;

        const total = pdfDoc.numPages;
        let completed = 0;
        const scale = 1.5; // render at 1.5x for crispness

        // Render pages in sequential batches to avoid overwhelming the browser
        for (let batchStart = 0; batchStart < total; batchStart += maxConcurrent) {
          if (isCancelled) break;

          const batchEnd = Math.min(batchStart + maxConcurrent, total);
          const batchPromises: Promise<void>[] = [];

          for (let pageIdx = batchStart; pageIdx < batchEnd; pageIdx++) {
            batchPromises.push(
              (async () => {
                if (isCancelled) return;

                try {
                  const page = await pdfDoc.getPage(pageIdx + 1); // 1-indexed in pdf.js
                  if (isCancelled) return;

                  const viewport = page.getViewport({ scale: 1 });
                  const thumbScale = (thumbWidth * scale) / viewport.width;
                  const scaledViewport = page.getViewport({ scale: thumbScale });

                  const canvas = document.createElement("canvas");
                  canvas.width = Math.floor(scaledViewport.width);
                  canvas.height = Math.floor(scaledViewport.height);
                  const ctx = canvas.getContext("2d");
                  if (!ctx) return;

                  // White background
                  ctx.fillStyle = "#ffffff";
                  ctx.fillRect(0, 0, canvas.width, canvas.height);

                  const renderTask = page.render({
                    canvasContext: ctx,
                    viewport: scaledViewport,
                  });
                  await renderTask.promise;

                  if (isCancelled) {
                    canvas.width = 0;
                    canvas.height = 0;
                    return;
                  }

                  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);

                  // Release canvas memory
                  canvas.width = 0;
                  canvas.height = 0;

                  completed++;

                  setThumbnails(prev => {
                    const next = new Map(prev);
                    next.set(pageIdx, dataUrl);
                    return next;
                  });
                  setProgress(Math.round((completed / total) * 100));
                } catch (pageErr) {
                  // Skip individual page errors
                  completed++;
                  setProgress(Math.round((completed / total) * 100));
                }
              })()
            );
          }

          await Promise.all(batchPromises);
        }

        if (!isCancelled) {
          setIsLoading(false);
          setProgress(100);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Thumbnail rendering error:", err);
          setError(err instanceof Error ? err.message : "Failed to render thumbnails");
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [pdfData, pageCount, thumbWidth, maxConcurrent]);

  return { thumbnails, isLoading, error, progress };
}
