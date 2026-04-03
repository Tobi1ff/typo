import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;

let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

if (apiKey) {
  const firebaseConfig = {
    apiKey,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        as string,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID          as string,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET      as string,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID              as string,
  };

  app = initializeApp(firebaseConfig);
  _auth = getAuth(app);

  const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID as string | undefined;
  _db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
}

export const auth = _auth;
export const db   = _db;

/**
 * Admin emails — set VITE_FIREBASE_ADMIN_EMAILS in Vercel as a
 * comma-separated list, e.g.:  admin@example.com,other@example.com
 */
export const ADMIN_EMAILS: string[] = (
  (import.meta.env.VITE_FIREBASE_ADMIN_EMAILS as string | undefined) ?? ''
)
  .split(',')
  .map(e => e.trim())
  .filter(Boolean);

export function isAdmin(): boolean {
  return !!(auth?.currentUser && ADMIN_EMAILS.includes(auth.currentUser.email ?? ''));
}

export function logError(context: string, error: unknown): void {
  console.error(`[Typo] ${context}:`, error);
}
