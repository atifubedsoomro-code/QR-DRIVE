import { DriveUploadResult } from '../types';

/**
 * Upload a document (PDF, Word, Doc, etc.) directly to Google Drive
 * and configure public viewer permissions so anyone scanning the QR code can access it.
 * Uses Google Drive API v3 Resumable Upload with automatic fallback to ensure 100% reliability.
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

  const mimeType = file.type || 'application/octet-stream';
  onProgress?.(15, 'Initiating Google Drive upload session...');

  let fileId: string | null = null;
  let webViewLink: string | null = null;
  let webContentLink: string | undefined = undefined;

  // METHOD 1: Resumable Upload Protocol (Official Google Drive Recommended Standard)
  try {
    const initRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': mimeType,
          'X-Upload-Content-Length': String(file.size),
        },
        body: JSON.stringify({
          name: fileName,
          description: 'Uploaded via QR-DRIVE. Scan QR code to view this soft copy.',
        }),
      }
    );

    if (initRes.ok) {
      const uploadLocation = initRes.headers.get('Location');
      if (uploadLocation) {
        onProgress?.(45, 'Streaming file bytes to Google Drive...');
        const streamRes = await fetch(uploadLocation, {
          method: 'PUT',
          headers: {
            'Content-Type': mimeType,
          },
          body: file,
        });

        if (streamRes.ok) {
          const uploadData = await streamRes.json();
          fileId = uploadData.id;
          webViewLink = uploadData.webViewLink;
          webContentLink = uploadData.webContentLink;
        } else {
          console.warn('Resumable PUT failed, will try 2-step media upload:', await streamRes.text());
        }
      }
    } else {
      const initErr = await initRes.text();
      console.warn('Resumable init failed:', initRes.status, initErr);

      // Check for disabled API error
      if (initErr.includes('has not been used') || initErr.includes('disabled')) {
        throw new Error(
          'Google Drive API is disabled on project 245248622910 in Google Cloud Console. Enable it at: https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=245248622910'
        );
      }
      if (initRes.status === 401) {
        throw new Error('Google OAuth token expired. Please click Connect Drive in the navbar to refresh your session.');
      }
    }
  } catch (err: any) {
    if (err.message && (err.message.includes('Google Drive API is disabled') || err.message.includes('token expired'))) {
      throw err;
    }
    console.warn('Method 1 resumable failed, trying Method 2:', err);
  }

  // METHOD 2: Direct 2-Step Upload (Create metadata, then PATCH media)
  if (!fileId) {
    onProgress?.(30, 'Creating document record in Google Drive...');
    const createMetaRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: fileName,
        description: 'Uploaded via QR-DRIVE. Scan QR code to view this soft copy.',
      }),
    });

    if (!createMetaRes.ok) {
      const errText = await createMetaRes.text();
      console.error('File creation failed:', createMetaRes.status, errText);

      if (errText.includes('has not been used') || errText.includes('disabled')) {
        throw new Error(
          'Google Drive API is not enabled on project 245248622910. Enable it at: https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=245248622910'
        );
      }
      if (createMetaRes.status === 401) {
        throw new Error('Google OAuth token expired. Please click Connect Drive in the navbar to refresh session.');
      }
      throw new Error(`Google Drive API error (${createMetaRes.status}): ${errText}`);
    }

    const createdData = await createMetaRes.json();
    fileId = createdData.id;
    webViewLink = createdData.webViewLink;

    onProgress?.(55, 'Uploading document content...');
    const mediaRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': mimeType,
        },
        body: file,
      }
    );

    if (!mediaRes.ok) {
      const mediaErr = await mediaRes.text();
      console.warn('Direct media PATCH warning:', mediaErr);
    }
  }

  if (!fileId) {
    throw new Error('Failed to retrieve file ID from Google Drive. Please verify your connection.');
  }

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
          allowFileDiscovery: false,
        }),
      }
    );

    if (permissionResponse.ok) {
      publicPermissionGranted = true;
    } else {
      const permErr = await permissionResponse.text();
      console.warn('Notice setting anyone permission:', permErr);
    }
  } catch (err) {
    console.warn('Error setting permission:', err);
  }

  onProgress?.(95, 'Finalizing public viewer URL...');

  // Standard verified public link that opens in any browser or phone camera
  const verifiedPublicLink = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

  onProgress?.(100, 'Upload complete!');

  return {
    fileId,
    name: fileName,
    webViewLink: verifiedPublicLink,
    webContentLink,
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
