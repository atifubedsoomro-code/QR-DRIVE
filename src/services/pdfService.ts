import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { CoverData, CoverTheme } from '../types';
import { COVER_THEMES } from '../constants/themes';

/**
 * Standard paper dimensions in PDF points (72 points per inch)
 */
export const PAPER_SIZES = {
  a4: { width: 595.28, height: 841.89 }, // 210mm x 297mm
  letter: { width: 612.0, height: 792.0 }, // 8.5" x 11"
};

/**
 * Converts a hex color string to pdf-lib rgb normalized (0-1) values
 */
function hexToPdfRgb(hex?: string, fallback = '#000000') {
  const target = hex && hex.startsWith('#') && hex.length >= 7 ? hex : fallback;
  const cleanHex = target.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return rgb(isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b);
}

/**
 * pdf-lib StandardFonts use WinAnsi / Latin-1 encoding.
 * Any unicode character outside WinAnsi (curly quotes, em-dashes, bullets, emojis)
 * will throw an unhandled exception and abort PDF rendering.
 * This function sanitizes all strings to prevent any crashes.
 */
function sanitizePdfText(text?: string): string {
  if (!text) return '';
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u2022\u25CF\u00B7]/g, '*')
    .replace(/[^\x00-\xFF]/g, ' ')
    .trim();
}

/**
 * Fetch image bytes as Uint8Array
 */
async function fetchImageBytes(url: string): Promise<{ bytes: Uint8Array; format: 'jpg' | 'png' } | null> {
  try {
    if (url.startsWith('data:image/')) {
      const parts = url.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || '';
      const binary = atob(parts[1]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return { bytes, format: mime.includes('png') ? 'png' : 'jpg' };
    }

    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || '';
    const format = contentType.includes('png') || url.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
    return { bytes: new Uint8Array(arrayBuffer), format };
  } catch (err) {
    console.warn('Could not fetch image for PDF embedding:', err);
    return null;
  }
}

/**
 * Generate a standalone high-resolution Cover Page PDF document
 */
export async function generateCoverPagePdf(
  coverData: CoverData,
  qrDataUrl: string
): Promise<PDFDocument> {
  const theme = COVER_THEMES.find((t) => t.id === coverData.themeId) || COVER_THEMES[0];
  const pdfDoc = await PDFDocument.create();

  const dims = PAPER_SIZES[coverData.paperSize] || PAPER_SIZES.a4;
  const page = pdfDoc.addPage([dims.width, dims.height]);

  // Load fonts
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontTimesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontTimesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontCourierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const isSerif = coverData.font === 'playfair' || coverData.font === 'merriweather';
  const isMono = coverData.font === 'mono';

  const titleFont = isSerif ? fontTimesRomanBold : isMono ? fontCourierBold : fontHelveticaBold;
  const bodyFont = isSerif ? fontTimesRoman : fontHelvetica;

  // Custom Color overrides with theme fallbacks
  const primaryRgb = hexToPdfRgb(coverData.primaryColor || theme.primaryColor, '#000000');
  const accentRgb = hexToPdfRgb(coverData.accentColor || theme.accentColor, '#facc15');
  const titleRgb = hexToPdfRgb(
    coverData.titleColor,
    theme.isDark ? '#ffffff' : coverData.primaryColor || theme.primaryColor
  );
  const subtitleRgb = hexToPdfRgb(coverData.subtitleColor, coverData.accentColor || theme.accentColor);
  const bodyRgb = hexToPdfRgb(coverData.textColor, theme.textColor || '#1e293b');
  const bgRgb = hexToPdfRgb(theme.backgroundColor, '#ffffff');

  // Background Fill
  page.drawRectangle({
    x: 0,
    y: 0,
    width: dims.width,
    height: dims.height,
    color: bgRgb,
  });

  // Check if Custom Full Background Image is set
  const bgImgUrl = coverData.backgroundImageUrl || (coverData.backgroundImageStyle === 'full' ? coverData.imageUrl : undefined);
  if (bgImgUrl) {
    const bgImgData = await fetchImageBytes(bgImgUrl);
    if (bgImgData) {
      try {
        const embeddedBg =
          bgImgData.format === 'png'
            ? await pdfDoc.embedPng(bgImgData.bytes)
            : await pdfDoc.embedJpg(bgImgData.bytes);

        const opacity = coverData.backgroundImageOpacity ?? 0.25;
        page.drawImage(embeddedBg, {
          x: 0,
          y: 0,
          width: dims.width,
          height: dims.height,
          opacity: Math.max(0.05, Math.min(1, opacity)),
        });
      } catch (e) {
        console.warn('Background image embed failed:', e);
      }
    }
  }

  // Layout Styles
  const layout = theme.layoutStyle;
  const centered = layout === 'plain-centered';
  const left = layout === 'plain-left-bar' ? 66 : 50;
  const centerX = (text: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, size: number) =>
    centered ? (dims.width - font.widthOfTextAtSize(text, size)) / 2 : left;

  if (layout === 'banner-top' || layout === 'split-vertical') {
    const bannerHeight = dims.height * 0.35;
    const bannerY = dims.height - bannerHeight;

    // Background color block behind banner
    page.drawRectangle({
      x: 0,
      y: bannerY,
      width: dims.width,
      height: bannerHeight,
      color: primaryRgb,
    });

    // Embed banner image if no full background
    if (coverData.imageUrl && !coverData.backgroundImageUrl) {
      const imgData = await fetchImageBytes(coverData.imageUrl);
      if (imgData) {
        try {
          const embeddedImg =
            imgData.format === 'png'
              ? await pdfDoc.embedPng(imgData.bytes)
              : await pdfDoc.embedJpg(imgData.bytes);
          page.drawImage(embeddedImg, {
            x: 0,
            y: bannerY,
            width: dims.width,
            height: bannerHeight,
            opacity: 0.9,
          });
        } catch (e) {
          console.warn('Image embed failed:', e);
        }
      }
    }

    // Accent line below banner
    page.drawRectangle({
      x: 0,
      y: bannerY - 6,
      width: dims.width,
      height: 6,
      color: accentRgb,
    });
  } else if (layout === 'bordered-formal') {
    const margin = 28;
    page.drawRectangle({
      x: margin,
      y: margin,
      width: dims.width - margin * 2,
      height: dims.height - margin * 2,
      borderColor: primaryRgb,
      borderWidth: 3,
    });
    page.drawRectangle({
      x: margin + 6,
      y: margin + 6,
      width: dims.width - (margin + 6) * 2,
      height: dims.height - (margin + 6) * 2,
      borderColor: accentRgb,
      borderWidth: 1,
    });
  } else if (layout === 'minimal-frame') {
    const margin = 24;
    page.drawRectangle({
      x: margin,
      y: margin,
      width: dims.width - margin * 2,
      height: dims.height - margin * 2,
      borderColor: accentRgb,
      borderWidth: 1,
    });
    // Corner accent brackets
    const bracketLen = 20;
    page.drawLine({ start: { x: margin - 4, y: dims.height - margin + 4 }, end: { x: margin + bracketLen, y: dims.height - margin + 4 }, thickness: 2, color: accentRgb });
    page.drawLine({ start: { x: margin - 4, y: dims.height - margin + 4 }, end: { x: margin - 4, y: dims.height - margin - bracketLen }, thickness: 2, color: accentRgb });
  } else if (layout === 'geometric-grid') {
    page.drawLine({
      start: { x: 40, y: dims.height - 40 },
      end: { x: dims.width - 40, y: dims.height - 40 },
      thickness: 3,
      color: accentRgb,
    });
    page.drawLine({
      start: { x: 40, y: dims.height - 40 },
      end: { x: 40, y: 40 },
      thickness: 1,
      color: accentRgb,
    });
  } else if (layout === 'bottom-accent') {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: dims.width,
      height: 120,
      color: primaryRgb,
    });
  } else if (layout === 'card-centered') {
    page.drawRectangle({
      x: 35,
      y: 40,
      width: dims.width - 70,
      height: dims.height - 80,
      borderColor: accentRgb,
      borderWidth: 1,
    });
  } else if (layout === 'plain-rule') {
    page.drawLine({
      start: { x: 50, y: dims.height - 38 },
      end: { x: dims.width - 50, y: dims.height - 38 },
      thickness: 2,
      color: primaryRgb,
    });
    page.drawLine({
      start: { x: 50, y: 22 },
      end: { x: dims.width - 50, y: 22 },
      thickness: 0.75,
      color: accentRgb,
    });
  } else if (layout === 'plain-left-bar') {
    page.drawRectangle({ x: 0, y: 0, width: 14, height: dims.height, color: primaryRgb });
    page.drawLine({
      start: { x: 24, y: 0 },
      end: { x: 24, y: dims.height },
      thickness: 0.75,
      color: accentRgb,
      opacity: 0.4,
    });
  }
  // 'plain' and 'plain-centered' draw no decoration at all

  // Draw Personal Logo if provided
  if (coverData.logoUrl && coverData.logoPosition !== 'qr-center') {
    const logoData = await fetchImageBytes(coverData.logoUrl);
    if (logoData) {
      try {
        const embeddedLogo =
          logoData.format === 'png'
            ? await pdfDoc.embedPng(logoData.bytes)
            : await pdfDoc.embedJpg(logoData.bytes);

        const logoScale = coverData.logoSize === 'large' ? 60 : coverData.logoSize === 'small' ? 30 : 45;
        const logoX = coverData.logoPosition === 'top-center' ? (dims.width - logoScale) / 2 : coverData.logoPosition === 'top-right' ? dims.width - logoScale - 50 : 50;
        const logoY = dims.height - logoScale - 45;

        page.drawImage(embeddedLogo, {
          x: logoX,
          y: logoY,
          width: logoScale,
          height: logoScale,
        });
      } catch (err) {
        console.warn('Logo embed error:', err);
      }
    }
  }

  // Draw Document ID / Reference at top ONLY if user entered one
  const topTextY = dims.height - 50;
  if (coverData.documentId) {
    page.drawText(sanitizePdfText(coverData.documentId.toUpperCase()), {
      x: left,
      y: topTextY,
      size: 10,
      font: fontCourierBold,
      color: accentRgb,
    });
  }

  if (coverData.organization) {
    page.drawText(sanitizePdfText(coverData.organization.toUpperCase()), {
      x: dims.width - 220,
      y: topTextY,
      size: 10,
      font: fontHelveticaBold,
      color: theme.isDark ? titleRgb : primaryRgb,
    });
  }

  // Content Area
  const contentStartY =
    layout === 'banner-top' || layout === 'split-vertical'
      ? dims.height * 0.54
      : centered
      ? dims.height * 0.6
      : dims.height * 0.72;

  // Title wrapping logic
  const sanitizedTitle = sanitizePdfText(coverData.title) || 'Document';
  const titleWords = sanitizedTitle.split(' ');
  const titleLines: string[] = [];
  let currentLine = '';
  for (const word of titleWords) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length > 28) {
      if (currentLine) titleLines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) titleLines.push(currentLine);

  let currentY = contentStartY;
  const titleFontSize = titleLines.length > 3 ? 24 : 30;

  for (const line of titleLines) {
    page.drawText(line, {
      x: centerX(line, titleFont, titleFontSize),
      y: currentY,
      size: titleFontSize,
      font: titleFont,
      color: titleRgb,
    });
    currentY -= titleFontSize + 8;
  }

  // Subtitle (ONLY if user provided one)
  if (coverData.subtitle) {
    currentY -= 6;
    page.drawText(sanitizePdfText(coverData.subtitle), {
      x: centerX(sanitizePdfText(coverData.subtitle), bodyFont, 14),
      y: currentY,
      size: 14,
      font: bodyFont,
      color: subtitleRgb,
    });
    currentY -= 24;
  }

  // Divider bar
  currentY -= 10;
  page.drawRectangle({
    x: centered ? (dims.width - 60) / 2 : left,
    y: currentY,
    width: 60,
    height: 4,
    color: accentRgb,
  });
  currentY -= 24;

  // Metadata block (ONLY if provided)
  if (coverData.preparedBy) {
    page.drawText('PREPARED BY', {
      x: left,
      y: currentY,
      size: 9,
      font: fontHelveticaBold,
      color: accentRgb,
    });
    page.drawText(sanitizePdfText(coverData.preparedBy), {
      x: left,
      y: currentY - 14,
      size: 12,
      font: bodyFont,
      color: bodyRgb,
    });
  }

  if (coverData.date) {
    page.drawText('DATE', {
      x: 240,
      y: currentY,
      size: 9,
      font: fontHelveticaBold,
      color: accentRgb,
    });
    page.drawText(sanitizePdfText(coverData.date), {
      x: 240,
      y: currentY - 14,
      size: 12,
      font: bodyFont,
      color: bodyRgb,
    });
  }

  if (coverData.preparedBy || coverData.date) {
    currentY -= 45;
  }

  // Summary (ONLY if user provided one)
  if (coverData.summary) {
    const summaryLines = wrapText(sanitizePdfText(coverData.summary), 60).slice(0, 4);
    for (const sLine of summaryLines) {
      page.drawText(sLine, {
        x: centerX(sLine, bodyFont, 10),
        y: currentY,
        size: 10,
        font: bodyFont,
        color: bodyRgb,
      });
      currentY -= 14;
    }
  }

  // Embed QR Code
  if (qrDataUrl) {
    try {
      const qrImageBytes = await fetch(qrDataUrl).then((r) => r.arrayBuffer());
      const embeddedQr = await pdfDoc.embedPng(new Uint8Array(qrImageBytes));

      const qrSize = 110;
      const qrX = dims.width - qrSize - 50;
      const qrY = 50;

      // Card frame for QR code
      page.drawRectangle({
        x: qrX - 8,
        y: qrY - 8,
        width: qrSize + 16,
        height: qrSize + 32,
        color: rgb(1, 1, 1),
        borderColor: hexToPdfRgb('#cbd5e1'),
        borderWidth: 1,
      });

      page.drawImage(embeddedQr, {
        x: qrX,
        y: qrY + 16,
        width: qrSize,
        height: qrSize,
      });

      // QR label under QR
      page.drawText('SCAN FOR DRIVE COPY', {
        x: qrX + 4,
        y: qrY + 2,
        size: 7,
        font: fontHelveticaBold,
        color: primaryRgb,
      });

      // Call to action banner next to QR
      const ctaWords = wrapText(
        sanitizePdfText(coverData.qrCallToAction) || 'Scan with phone camera to view full soft copy on Google Drive.',
        36
      );
      let ctaY = qrY + qrSize - 4;
      for (const ctaLine of ctaWords) {
        page.drawText(ctaLine, {
          x: left,
          y: ctaY,
          size: 9,
          font: bodyFont,
          color: theme.isDark ? hexToPdfRgb('#cbd5e1') : hexToPdfRgb('#374151'),
        });
        ctaY -= 12;
      }
    } catch (e) {
      console.warn('QR code embedding failed:', e);
    }
  }

  // Footer branding
  page.drawText('DOCUMENT CERTIFIED & CLOUD-LINKED VIA QR-DRIVE', {
    x: left,
    y: 30,
    size: 7,
    font: fontHelvetica,
    color: hexToPdfRgb('#9ca3af'),
  });

  return pdfDoc;
}

/**
 * Merge newly created Cover Page as Page 1 with an uploaded PDF document.
 * Safely clones original ArrayBuffer to avoid detachment issues.
 */
export async function mergeCoverWithPdf(
  originalPdfArrayBuffer: ArrayBuffer,
  coverData: CoverData,
  qrDataUrl: string
): Promise<Uint8Array> {
  // 1. Generate Cover Page PDF
  const coverPdf = await generateCoverPagePdf(coverData, qrDataUrl);

  // 2. Clone ArrayBuffer safely
  const safeBuffer = new Uint8Array(originalPdfArrayBuffer).slice().buffer;

  // 3. Load original PDF
  const originalPdf = await PDFDocument.load(safeBuffer, { ignoreEncryption: true });

  // 4. Create merged doc
  const mergedPdf = await PDFDocument.create();

  // Copy cover page
  const [copiedCover] = await mergedPdf.copyPages(coverPdf, [0]);
  mergedPdf.addPage(copiedCover);

  // Copy all original pages
  const originalPageCount = originalPdf.getPageCount();
  const pageIndices = Array.from({ length: originalPageCount }, (_, i) => i);
  const copiedPages = await mergedPdf.copyPages(originalPdf, pageIndices);

  copiedPages.forEach((p) => mergedPdf.addPage(p));

  // Save and return
  return await mergedPdf.save();
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > maxCharsPerLine) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}
