import QRCode from 'qrcode';

export interface GenerateQROptions {
  url: string;
  colorDark?: string;
  colorLight?: string;
  width?: number;
  margin?: number;
  logoUrl?: string;
}

/**
 * Generate a high resolution PNG Data URL for print and display
 */
export async function generateQRCodeDataUrl({
  url,
  colorDark = '#000000',
  colorLight = '#ffffff',
  width = 600,
  margin = 2,
  logoUrl,
}: GenerateQROptions): Promise<string> {
  const baseQrDataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: logoUrl ? 'H' : 'M',
    type: 'image/png',
    margin,
    width,
    color: {
      dark: colorDark,
      light: colorLight,
    },
  });

  if (!logoUrl) {
    return baseQrDataUrl;
  }

  // Draw logo in center if provided
  try {
    return await new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = width;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(baseQrDataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, width);

        // Load logo
        const logo = new Image();
        logo.crossOrigin = 'anonymous';
        logo.onload = () => {
          const logoSize = width * 0.22;
          const logoPos = (width - logoSize) / 2;

          // Draw white background circle for logo
          ctx.beginPath();
          ctx.arc(width / 2, width / 2, (logoSize / 2) + 6, 0, Math.PI * 2);
          ctx.fillStyle = colorLight;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = colorDark;
          ctx.stroke();

          // Draw logo rounded
          ctx.save();
          ctx.beginPath();
          ctx.arc(width / 2, width / 2, logoSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(logo, logoPos, logoPos, logoSize, logoSize);
          ctx.restore();

          resolve(canvas.toDataURL('image/png'));
        };
        logo.onerror = () => resolve(baseQrDataUrl);
        logo.src = logoUrl;
      };
      img.onerror = () => resolve(baseQrDataUrl);
      img.src = baseQrDataUrl;
    });
  } catch (err) {
    console.warn('Could not overlay logo in QR, using base QR:', err);
    return baseQrDataUrl;
  }
}

/**
 * Generate SVG string of the QR Code for scalable vector rendering
 */
export async function generateQRCodeSvg({
  url,
  colorDark = '#000000',
  colorLight = '#ffffff',
  margin = 2,
}: GenerateQROptions): Promise<string> {
  return await QRCode.toString(url, {
    type: 'svg',
    margin,
    color: {
      dark: colorDark,
      light: colorLight,
    },
  });
}
