import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  deleteDoc,
} from 'firebase/firestore';
import { SavedDocRecord } from './types';
import appletConfig from '../firebase-applet-config.json';

// Configure Firebase strictly with user's dedicated QR-DRIVE project
const config = {
  apiKey: appletConfig.apiKey || 'AIzaSyD-44iztVhZurorn6blmehXGmzDKDdyRNg',
  authDomain: appletConfig.authDomain || 'qr-drive-325f8.firebaseapp.com',
  projectId: appletConfig.projectId || 'qr-drive-325f8',
  storageBucket: appletConfig.storageBucket || 'qr-drive-325f8.firebasestorage.app',
  messagingSenderId: appletConfig.messagingSenderId || '245248622910',
  appId: appletConfig.appId || '1:245248622910:web:a9aa9a785cab370011ec6f',
  measurementId: appletConfig.measurementId || 'G-P43SP7XPNT',
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Provider with required scopes: Google Drive file management & Gmail send
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to track sign-in in progress
let isSigningIn = false;
// In-memory token cache (never stored in localStorage)
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Cached token lost on page refresh; user will need to reconnect to get fresh access token
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google did not return an access token for Drive & Gmail');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setCachedToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch {}
  cachedAccessToken = null;
};

// Firestore document persistence with seamless local storage fallback
const LOCAL_STORAGE_DOCS_KEY = 'docqr_saved_documents';

export const saveDocumentRecord = async (record: SavedDocRecord): Promise<void> => {
  // Always update local storage first so user never loses data
  try {
    const existingRaw = localStorage.getItem(LOCAL_STORAGE_DOCS_KEY);
    const existing: SavedDocRecord[] = existingRaw ? JSON.parse(existingRaw) : [];
    const updated = [record, ...existing.filter((d) => d.id !== record.id)];
    localStorage.setItem(LOCAL_STORAGE_DOCS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('LocalStorage save warning:', err);
  }

  // Attempt Firestore save
  try {
    const docRef = doc(db, 'documents', record.id);
    await setDoc(docRef, record, { merge: true });
  } catch (err) {
    console.warn('Firestore save notice (using local offline storage):', err);
  }
};

export const getSavedDocuments = async (userEmail?: string): Promise<SavedDocRecord[]> => {
  let firestoreDocs: SavedDocRecord[] = [];
  try {
    const docsCol = collection(db, 'documents');
    const q = userEmail ? query(docsCol, where('userEmail', '==', userEmail)) : docsCol;
    const snapshot = await getDocs(q);
    firestoreDocs = snapshot.docs.map((docSnap) => docSnap.data() as SavedDocRecord);
  } catch (err) {
    console.warn('Firestore read notice (falling back to local cache):', err);
  }

  let localDocs: SavedDocRecord[] = [];
  try {
    const existingRaw = localStorage.getItem(LOCAL_STORAGE_DOCS_KEY);
    if (existingRaw) {
      localDocs = JSON.parse(existingRaw);
      if (userEmail) {
        localDocs = localDocs.filter((d) => !d.userEmail || d.userEmail === userEmail);
      }
    }
  } catch (err) {
    console.warn('LocalStorage read error:', err);
  }

  // Merge unique by id
  const map = new Map<string, SavedDocRecord>();
  [...firestoreDocs, ...localDocs].forEach((docItem) => {
    map.set(docItem.id, docItem);
  });

  return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
};

export const deleteDocumentRecord = async (docId: string): Promise<void> => {
  try {
    const existingRaw = localStorage.getItem(LOCAL_STORAGE_DOCS_KEY);
    if (existingRaw) {
      const existing: SavedDocRecord[] = JSON.parse(existingRaw);
      localStorage.setItem(LOCAL_STORAGE_DOCS_KEY, JSON.stringify(existing.filter((d) => d.id !== docId)));
    }
  } catch (err) {
    console.warn('LocalStorage delete error:', err);
  }

  try {
    await deleteDoc(doc(db, 'documents', docId));
  } catch (err) {
    console.warn('Firestore delete error:', err);
  }
};
