import { PDFDocument } from 'pdf-lib';
import * as mammoth from 'mammoth';
import { UploadedDocInfo } from '../types';

export async function parseUploadedDocument(file: File): Promise<UploadedDocInfo> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const arrayBuffer = await file.arrayBuffer();

  const baseInfo: UploadedDocInfo = {
    id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    extension,
  };

  try {
    if (extension === 'pdf') {
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const pageCount = pdfDoc.getPageCount();
      const title = pdfDoc.getTitle();

      let renderedPagePreviews: string[] = [];
      try {
        renderedPagePreviews = await renderPdfPages(arrayBuffer);
      } catch (e) {
        console.warn('Page preview extraction skipped:', e);
      }

      return {
        ...baseInfo,
        pageCount,
        extractedTitle: title || cleanFileName(file.name),
        pdfArrayBuffer: arrayBuffer,
        renderedPagePreviews,
      };
    }

    if (extension === 'docx') {
      const result = await mammoth.extractRawText({ arrayBuffer });
      const rawText = result.value || '';
      const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
      const firstLine = lines[0] || '';
      const wordCount = rawText.split(/\s+/).filter(Boolean).length;
      const sampleSnippet = lines.slice(1, 4).join(' ').slice(0, 220);

      return {
        ...baseInfo,
        pageCount: Math.max(1, Math.ceil(wordCount / 400)),
        wordCount,
        extractedTitle: firstLine.length < 90 && firstLine.length > 3 ? firstLine : cleanFileName(file.name),
        extractedText: sampleSnippet,
      };
    }

    if (['txt', 'md', 'rtf'].includes(extension)) {
      const text = new TextDecoder('utf-8').decode(arrayBuffer);
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      const sampleSnippet = lines.slice(1, 4).join(' ').slice(0, 220);

      return {
        ...baseInfo,
        pageCount: Math.max(1, Math.ceil(wordCount / 400)),
        wordCount,
        extractedTitle: lines[0]?.slice(0, 80) || cleanFileName(file.name),
        extractedText: sampleSnippet,
      };
    }
  } catch (err) {
    console.warn('Could not parse document details, using defaults:', err);
  }

  return {
    ...baseInfo,
    extractedTitle: cleanFileName(file.name),
  };
}

export function cleanFileName(name: string): string {
  // Strip extension and dashes/underscores into human readable title
  const withoutExt = name.replace(/\.[^/.]+$/, '');
  const cleaned = withoutExt
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
  // Capitalize words
  return cleaned
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

/**
 * Render PDF pages onto canvas and return data URLs for multi-page print preview.
 * Robust against iframe / worker cross-origin issues.
 */
export async function renderPdfPages(arrayBuffer: ArrayBuffer, maxPages = 12): Promise<string[]> {
  if (typeof window === 'undefined') return [];

  // Wait a short moment if pdfjsLib script is loading in background
  if (!window.pdfjsLib) {
    let waited = 0;
    while (!window.pdfjsLib && waited < 10) {
      await new Promise((r) => setTimeout(r, 100));
      waited++;
    }
  }

  if (!window.pdfjsLib) return [];

  try {
    try {
      if (window.pdfjsLib.GlobalWorkerOptions) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
    } catch {}

    // Clone ArrayBuffer safely to avoid detachment
    const safeBuffer = new Uint8Array(arrayBuffer).slice().buffer;
    const loadingTask = window.pdfjsLib.getDocument({
      data: safeBuffer,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const totalPages = Math.min(pdf.numPages, maxPages);
    const pageImageUrls: string[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          pageImageUrls.push(canvas.toDataURL('image/jpeg', 0.85));
        }
      } catch (pageErr) {
        console.warn(`Failed rendering page ${pageNum}:`, pageErr);
      }
    }

    return pageImageUrls;
  } catch (err) {
    console.warn('PDF page rendering caught error (safe fallback):', err);
    return [];
  }
}
