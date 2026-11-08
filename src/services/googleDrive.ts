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
    throw new Error('Access token is required. Please sign in with Google.');
  }

  const mimeType = file.type || 'application/octet-stream';
  const metadata = {
    name: fileName,
    description: 'Uploaded via DocQR Cover Generator. Scan QR code to view this soft copy.',
  };

  const boundary = '-------DocQRBoundary' + Math.random().toString(36).substring(2);
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n`;

  const multipartBody = new Blob(
    [
      new Blob([metadataPart], { type: 'text/plain' }),
      file,
      new Blob([closeDelimiter], { type: 'text/plain' }),
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );

  onProgress?.(40, 'Uploading document to Google Drive...');

  const uploadResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: multipartBody,
    }
  );

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('Drive upload failed:', uploadResponse.status, errorText);
    throw new Error(`Google Drive upload failed (${uploadResponse.status}): ${errorText}`);
  }

  const uploadData = await uploadResponse.json();
  const fileId = uploadData.id;

  onProgress?.(75, 'Configuring Public Viewer permissions for QR scanning...');

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
        }),
      }
    );

    if (permissionResponse.ok) {
      publicPermissionGranted = true;
    } else {
      console.warn('Could not set anyone permission, trying with domain or link:', await permissionResponse.text());
    }
  } catch (err) {
    console.warn('Error setting permission:', err);
  }

  onProgress?.(95, 'Finalizing public viewer link...');

  // Query file details to get exact webViewLink
  let finalWebViewLink = uploadData.webViewLink;
  if (!finalWebViewLink) {
    try {
      const getFileRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,webViewLink,webContentLink`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (getFileRes.ok) {
        const fileInfo = await getFileRes.json();
        finalWebViewLink = fileInfo.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
      }
    } catch {
      // Fallback standard drive link format
      finalWebViewLink = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    }
  }

  // Ensure it includes view?usp=sharing so mobile browsers open the viewer cleanly
  if (finalWebViewLink && !finalWebViewLink.includes('usp=sharing')) {
    finalWebViewLink = finalWebViewLink.includes('?')
      ? `${finalWebViewLink}&usp=sharing`
      : `${finalWebViewLink}?usp=sharing`;
  }

  onProgress?.(100, 'Upload complete!');

  return {
    fileId,
    name: uploadData.name || fileName,
    webViewLink: finalWebViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
    webContentLink: uploadData.webContentLink,
    publicPermissionGranted,
  };
}
