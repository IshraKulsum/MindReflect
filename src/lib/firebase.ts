import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  Auth,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  Firestore,
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { JournalEntry, AuthUserProfile } from '../types';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

// Initialize Firebase app singleton
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Cloud Firestore with dedicated or default database ID
const dbId = (firebaseConfigJson as any).firestoreDatabaseId;
export const db: Firestore = dbId && dbId !== '(default)'
  ? getFirestore(app, dbId)
  : getFirestore(app);

// Zero-Crash Payload Hygiene: strictly strips undefined properties before Firestore writes
export function sanitizePayload<T>(obj: T): T {
  if (obj === undefined) return null as unknown as T;
  return JSON.parse(JSON.stringify(obj, (_, val) => (val === undefined ? null : val)));
}

// Google Sign-In helper
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Firebase Google Sign-In error:', error);
    throw error;
  }
}

// Sign-Out helper
export async function signOutUser(): Promise<void> {
  await fbSignOut(auth);
}

// Convert Firebase User to clean AuthUserProfile
export function mapFirebaseUser(user: User | null): AuthUserProfile | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

// Collection path for strictly isolated user interactions: /users/{userId}/interactions
function getInteractionsCollection(userId: string) {
  if (!userId) {
    throw new Error('User ID is required for Firestore operations.');
  }
  return collection(db, 'users', userId, 'interactions');
}

// Save or overwrite a journal interaction document in Firestore
export async function saveJournalEntry(
  userId: string,
  entry: JournalEntry
): Promise<void> {
  if (!userId) throw new Error('Cannot persist without authenticated user ID.');
  const docRef = doc(db, 'users', userId, 'interactions', entry.id);
  const cleanData = sanitizePayload({
    ...entry,
    userId,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(docRef, cleanData, { merge: true });
}

// Fetch all journal interaction documents for the authenticated user
export async function fetchUserJournalEntries(userId: string): Promise<JournalEntry[]> {
  if (!userId) return [];
  const colRef = getInteractionsCollection(userId);
  const q = query(colRef, orderBy('updatedAt', 'desc'));
  
  try {
    const snapshot = await getDocs(q);
    const entries: JournalEntry[] = [];
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data() as JournalEntry;
      entries.push({
        ...data,
        id: docSnapshot.id,
      });
    });
    return entries;
  } catch (err: any) {
    console.error('Failed to load user reflections from Firestore:', err);
    throw err;
  }
}

// Delete an interaction document
export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) return;
  const docRef = doc(db, 'users', userId, 'interactions', entryId);
  await deleteDoc(docRef);
}
