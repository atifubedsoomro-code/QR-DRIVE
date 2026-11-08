import { DriveUploadResult } from '../types';

/**
 * Upload a document (PDF, Word, Doc, etc.) directly to Google Drive
 * and configure public viewer permissions so anyone scanning the QR code can access it.
 */
export async function uploadDocumentToDrive(
  file: File | Blob,
  fileName: string,
  accessToken: string,
  onProgress?: (percent: number, status: string) => void
): Promise<DriveUploadResult> {
  if (!accessToken) {
    throw new Error('Please sign in with Google to connect Google Drive.');
  }

  const mimeType = file.type || 'application/pdf';
  // Standard RFC multipart boundary
  const boundary = 'DocQRBoundary' + Date.now().toString(16) + Math.random().toString(36).substring(2);
  const delimiter = `--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    description: 'Uploaded via QR-DRIVE. Scan QR code to view this soft copy.',
  };

  const metadataPart =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    '\r\n' +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n`;

  const multipartBody = new Blob(
    [
      new Blob([metadataPart], { type: 'text/plain; charset=UTF-8' }),
      file,
      new Blob([closeDelimiter], { type: 'text/plain; charset=UTF-8' }),
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );

  onProgress?.(35, 'Uploading document to Google Drive...');

  const uploadResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('Drive upload failed:', uploadResponse.status, errorText);

    let friendlyMessage = errorText;
    try {
      const errJson = JSON.parse(errorText);
      const apiMsg = errJson?.error?.message;
      if (apiMsg) {
        if (apiMsg.includes('has not been used') || apiMsg.includes('disabled')) {
          friendlyMessage =
            'Google Drive API is not enabled on project 245248622910. Enable it at: https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=245248622910';
        } else {
          friendlyMessage = apiMsg;
        }
      }
    } catch {}

    throw new Error(friendlyMessage);
  }

  const uploadData = await uploadResponse.json();
  const fileId = uploadData.id;

  onProgress?.(70, 'Configuring Public Viewer permissions for QR scanning...');

  // Set permission to anyone with link as reader (Public Viewer)
  let publicPermissionGranted = false;
  try {
    const permissionResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
          allowFileDiscovery: false,
        }),
      }
    );

    if (permissionResponse.ok) {
      publicPermissionGranted = true;
    } else {
      const permErr = await permissionResponse.text();
      console.warn('Notice setting anyone permission (might already be public):', permErr);
    }
  } catch (err) {
    console.warn('Error setting permission:', err);
  }

  onProgress?.(95, 'Finalizing public viewer URL...');

  // Standard verified public link that opens on all mobile devices and desktop
  const verifiedPublicLink = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

  onProgress?.(100, 'Upload complete!');

  return {
    fileId,
    name: uploadData.name || fileName,
    webViewLink: verifiedPublicLink,
    webContentLink: uploadData.webContentLink,
    publicPermissionGranted,
  };
}

/**
 * Validate and clean a Google Drive URL provided manually by user
 */
export function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}
