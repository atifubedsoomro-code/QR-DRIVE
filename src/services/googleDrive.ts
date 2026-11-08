import { DriveUploadResult } from '../types';

const GCP_PROJECT_NUMBER = '245248622910';
const UPLOAD_FIELDS = 'id,name,mimeType,size,webViewLink,webContentLink';
const MULTIPART_LIMIT = 5 * 1024 * 1024; // Files up to 5 MB go in a single request
const DESCRIPTION = 'Uploaded via QR-DRIVE. Scan QR code to view this soft copy.';

export type DriveErrorCode =
  | 'auth' // token missing / expired
  | 'scope' // user did not grant the Drive permission on the Google consent screen
  | 'api-disabled' // Drive API not enabled on the Google Cloud project
  | 'quota' // user's Drive is full
  | 'rate-limit'
  | 'network'
  | 'incomplete' // Drive stored a different number of bytes than we sent
  | 'unknown';

/**
 * Every failure in the Drive upload flow is thrown as this error, so the UI can show
 * the real reason and offer the right recovery action instead of a generic alert.
 */
export class DriveUploadError extends Error {
  code: DriveErrorCode;
  status?: number;

  constructor(code: DriveErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'DriveUploadError';
    this.code = code;
    this.status = status;
  }
}

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  txt: 'text/plain',
  md: 'text/markdown',
  rtf: 'application/rtf',
};

function resolveMimeType(file: File | Blob, fileName: string): string {
  if (file.type) return file.type;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return MIME_BY_EXTENSION[ext] || 'application/octet-stream';
}

interface ParsedDriveError {
  status: number;
  reason: string;
  message: string;
}

function parseDriveError(status: number, bodyText: string): ParsedDriveError {
  let reason = '';
  let message = bodyText.slice(0, 300);
  try {
    const err = JSON.parse(bodyText)?.error;
    if (err) {
      message = err.message || message;
      reason =
        err.errors?.[0]?.reason ||
        err.details?.find((d: any) => d?.reason)?.reason ||
        err.status ||
        '';
    }
  } catch {
    // Body was not JSON; keep the raw snippet as the message
  }
  return { status, reason, message };
}

function toDriveError(raw: ParsedDriveError): DriveUploadError {
  const reason = raw.reason.toLowerCase();
  const text = `${reason} ${raw.message.toLowerCase()}`;

  if (raw.status === 401) {
    return new DriveUploadError(
      'auth',
      'Your Google session has expired. Click "Connect Drive" and sign in again.',
      401
    );
  }

  if (
    reason === 'insufficientpermissions' ||
    reason === 'access_token_scope_insufficient' ||
    text.includes('insufficient authentication scopes') ||
    text.includes('insufficient permission')
  ) {
    return new DriveUploadError(
      'scope',
      'Google Drive permission was not granted. On the Google sign-in screen, tick the box that lets QR-DRIVE create and manage its own Drive files, then sign in again.',
      raw.status
    );
  }

  if (
    reason === 'accessnotconfigured' ||
    reason === 'service_disabled' ||
    text.includes('has not been used in project') ||
    text.includes('api has not been enabled')
  ) {
    const project = raw.message.match(/project[ =](\d{6,})/i)?.[1] || GCP_PROJECT_NUMBER;
    return new DriveUploadError(
      'api-disabled',
      `The Google Drive API is not enabled for Google Cloud project ${project}. Enable it at https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=${project} , wait a minute, then try again.`,
      raw.status
    );
  }

  if (reason === 'storagequotaexceeded') {
    return new DriveUploadError('quota', 'Your Google Drive storage is full. Free up space and try again.', raw.status);
  }

  if (raw.status === 429 || reason === 'ratelimitexceeded' || reason === 'userratelimitexceeded') {
    return new DriveUploadError('rate-limit', 'Google Drive is rate limiting requests. Wait a moment and try again.', raw.status);
  }

  return new DriveUploadError('unknown', `Google Drive error (${raw.status}): ${raw.message}`, raw.status);
}

const networkError = () =>
  new DriveUploadError('network', 'Network error while contacting Google Drive. Check your connection and try again.');

async function driveFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw networkError();
  }
}

interface XhrResult {
  status: number;
  text: string;
  getHeader: (name: string) => string | null;
}

/** XMLHttpRequest is used for the byte upload because fetch cannot report upload progress. */
function xhrSend(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: Blob,
  onFraction?: (fraction: number) => void
): Promise<XhrResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onFraction?.(e.loaded / e.total);
    };
    xhr.onload = () =>
      resolve({
        status: xhr.status,
        text: xhr.responseText,
        getHeader: (name) => xhr.getResponseHeader(name),
      });
    xhr.onerror = () => reject(networkError());
    xhr.ontimeout = () => reject(networkError());
    xhr.send(body);
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Retry only on network failures and Google 5xx responses; everything else is final. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const retryable =
        err instanceof DriveUploadError &&
        (err.code === 'network' || (err.status !== undefined && err.status >= 500));
      if (!retryable || i === attempts - 1) throw err;
      await sleep(800 * (i + 1));
    }
  }
  throw lastError;
}

/**
 * Ask Google what this access token can actually do. If the user unticked the Drive
 * checkbox on the consent screen, every upload would fail with a vague 403, so we catch
 * it up front. A failure of the check itself (offline, blocked) is ignored.
 */
async function verifyTokenScopes(accessToken: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
    );
  } catch {
    return;
  }

  if (res.status === 400 || res.status === 401) {
    throw toDriveError({ status: 401, reason: '', message: 'Invalid token' });
  }
  if (!res.ok) return;

  const info = await res.json().catch(() => null);
  const scopes: string[] = typeof info?.scope === 'string' ? info.scope.split(' ') : [];
  if (scopes.length > 0 && !scopes.some((s) => s.endsWith('/auth/drive.file') || s.endsWith('/auth/drive'))) {
    throw toDriveError({ status: 403, reason: 'insufficientPermissions', message: 'Drive scope missing' });
  }
}

interface UploadedFileInfo {
  id: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
}

function parseUploadResponse(res: XhrResult): UploadedFileInfo {
  if (res.status < 200 || res.status >= 300) {
    throw toDriveError(parseDriveError(res.status, res.text));
  }
  let data: any;
  try {
    data = JSON.parse(res.text);
  } catch {
    data = null;
  }
  if (!data?.id) {
    throw new DriveUploadError('unknown', 'Google Drive accepted the request but did not return a file ID. Please try again.');
  }
  return data as UploadedFileInfo;
}

/** Single-request upload (metadata + bytes together). Used for files up to 5 MB. */
async function uploadMultipart(
  file: File | Blob,
  fileName: string,
  mimeType: string,
  accessToken: string,
  onFraction: (f: number) => void
): Promise<UploadedFileInfo> {
  const boundary = `qrdrive_${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  const metadata = JSON.stringify({ name: fileName, mimeType, description: DESCRIPTION });

  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    metadata,
    `\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    file,
    `\r\n--${boundary}--`,
  ]);

  const res = await xhrSend(
    'POST',
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=${UPLOAD_FIELDS}`,
    {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
    onFraction
  );
  return parseUploadResponse(res);
}

/** Resumable upload for larger files: open a session, then stream the bytes to it. */
async function uploadResumable(
  file: File | Blob,
  fileName: string,
  mimeType: string,
  accessToken: string,
  onFraction: (f: number) => void
): Promise<UploadedFileInfo> {
  const initRes = await driveFetch(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=${UPLOAD_FIELDS}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(file.size),
      },
      body: JSON.stringify({ name: fileName, mimeType, description: DESCRIPTION }),
    }
  );

  if (!initRes.ok) {
    throw toDriveError(parseDriveError(initRes.status, await initRes.text()));
  }

  const sessionUrl = initRes.headers.get('Location');
  if (!sessionUrl) {
    throw new DriveUploadError('unknown', 'Google Drive did not return an upload session URL. Please try again.');
  }

  const res = await xhrSend('PUT', sessionUrl, { 'Content-Type': mimeType }, file, onFraction);
  return parseUploadResponse(res);
}

async function deleteQuietly(fileId: string, accessToken: string) {
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    // Best effort only
  }
}

async function makePublicViewer(
  fileId: string,
  accessToken: string
): Promise<{ granted: boolean; warning?: string }> {
  try {
    const res = await withRetry(async () => {
      const r = await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'reader', type: 'anyone', allowFileDiscovery: false }),
      });
      if (r.status >= 500) throw toDriveError(parseDriveError(r.status, await r.text()));
      return r;
    });

    if (res.ok) return { granted: true };

    const raw = parseDriveError(res.status, await res.text());
    return {
      granted: false,
      warning: `The file was uploaded, but Google would not make it public (${raw.message}). Open it in Google Drive, choose Share, and set General access to "Anyone with the link" so people who scan the QR code can open it.`,
    };
  } catch (err: any) {
    return {
      granted: false,
      warning: `The file was uploaded, but public access could not be set (${err?.message || 'unknown error'}). Open it in Google Drive, choose Share, and set General access to "Anyone with the link".`,
    };
  }
}

/**
 * Upload a document to the user's Google Drive and make it viewable by anyone with the link,
 * so the QR code on the cover page opens it directly.
 *
 * Throws DriveUploadError on any failure. It never reports success unless Drive confirms it
 * stored exactly the bytes that were sent.
 */
export async function uploadDocumentToDrive(
  file: File | Blob,
  fileName: string,
  accessToken: string,
  onProgress?: (percent: number, status: string) => void
): Promise<DriveUploadResult> {
  if (!accessToken) {
    throw new DriveUploadError('auth', 'Please sign in with Google to connect Google Drive.');
  }

  const mimeType = resolveMimeType(file, fileName);

  onProgress?.(5, 'Checking Google Drive access...');
  await verifyTokenScopes(accessToken);

  onProgress?.(12, 'Uploading document to Google Drive...');
  const onFraction = (f: number) =>
    onProgress?.(12 + Math.round(f * 58), `Uploading document to Google Drive... ${Math.round(f * 100)}%`);

  const uploaded = await withRetry(() =>
    file.size <= MULTIPART_LIMIT
      ? uploadMultipart(file, fileName, mimeType, accessToken, onFraction)
      : uploadResumable(file, fileName, mimeType, accessToken, onFraction)
  );

  // Never report success for a partial or empty upload
  if (uploaded.size !== undefined && Number(uploaded.size) !== file.size) {
    await deleteQuietly(uploaded.id, accessToken);
    throw new DriveUploadError(
      'incomplete',
      `Google Drive stored ${uploaded.size} bytes but ${file.size} were sent. The upload was discarded, please try again.`
    );
  }

  onProgress?.(78, 'Setting public viewer access for QR scanning...');
  const permission = await makePublicViewer(uploaded.id, accessToken);

  onProgress?.(95, 'Finalizing public viewer link...');
  const publicLink = `https://drive.google.com/file/d/${uploaded.id}/view?usp=sharing`;

  onProgress?.(100, 'Upload complete!');

  return {
    fileId: uploaded.id,
    name: fileName,
    webViewLink: publicLink,
    webContentLink: uploaded.webContentLink,
    publicPermissionGranted: permission.granted,
    permissionWarning: permission.warning,
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
