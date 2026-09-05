import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, mapFirebaseUser, saveJournalEntry, fetchUserJournalEntries, deleteJournalEntry } from './lib/firebase';
import { AuthUserProfile, JournalEntry, PersistenceStatus } from './types';
import { LandingPage } from './components/LandingPage';
import { Navbar } from './components/Navbar';
import { JournalSidebar } from './components/JournalSidebar';
import { ReflectionWorkspace } from './components/ReflectionWorkspace';
import { WalkthroughModal } from './components/WalkthroughModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Journal entries state
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus>('idle');
  const [lastFailedEntry, setLastFailedEntry] = useState<JournalEntry | null>(null);

  // Walkthrough modal state
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      const mapped = mapFirebaseUser(user);
      setCurrentUser(mapped);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch entries when authenticated user changes
  useEffect(() => {
    if (!currentUser?.uid) {
      setEntries([]);
      setSelectedEntryId(null);
      return;
    }

    let isMounted = true;
    const loadEntries = async () => {
      setLoadingEntries(true);
      try {
        const data = await fetchUserJournalEntries(currentUser.uid);
        if (isMounted) {
          setEntries(data);
          if (data.length > 0 && !selectedEntryId) {
            setSelectedEntryId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load user journal entries:', err);
      } finally {
        if (isMounted) setLoadingEntries(false);
      }
    };

    loadEntries();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid]);

  // Guaranteed Transaction Persistence handler
  const handleSaveEntry = useCallback(
    async (entry: JournalEntry) => {
      if (!currentUser?.uid) return;

      setPersistenceStatus('saving');
      setLastFailedEntry(null);

      try {
        await saveJournalEntry(currentUser.uid, entry);
        setPersistenceStatus('saved');

        // Update in memory list
        setEntries((prev) => {
          const index = prev.findIndex((e) => e.id === entry.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = entry;
            return next;
          } else {
            return [entry, ...prev];
          }
        });

        setSelectedEntryId(entry.id);

        // Reset to idle after 3s
        setTimeout(() => {
          setPersistenceStatus((current) => (current === 'saved' ? 'idle' : current));
        }, 3000);
      } catch (err: any) {
        console.error('Firestore save failed:', err);
        setPersistenceStatus('error');
        setLastFailedEntry(entry);
        throw err;
      }
    },
    [currentUser?.uid]
  );

  // Retry save if failed
  const handleRetrySave = async () => {
    if (lastFailedEntry) {
      try {
        await handleSaveEntry(lastFailedEntry);
      } catch (err) {
        console.error('Retry save failed:', err);
      }
    }
  };

  // Start a new reflection
  const handleNewReflection = () => {
    setSelectedEntryId(null);
  };

  // Select an existing entry
  const handleSelectEntry = (entry: JournalEntry) => {
    setSelectedEntryId(entry.id);
  };

  // Delete an entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!currentUser?.uid) return;
    try {
      await deleteJournalEntry(currentUser.uid, entryId);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      if (selectedEntryId === entryId) {
        setSelectedEntryId(null);
      }
    } catch (err) {
      console.error('Failed to delete reflection document:', err);
      alert('Failed to delete reflection from Firestore. Please check your network connection.');
    }
  };

  // Active entry resolution
  const activeEntry = entries.find((e) => e.id === selectedEntryId) || null;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-amber-800 rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium text-stone-500 font-sans tracking-wide">
          Verifying security session...
        </p>
      </div>
    );
  }

  // User not authenticated -> Landing Page
  if (!currentUser) {
    return (
      <>
        <LandingPage onOpenWalkthrough={() => setIsWalkthroughOpen(true)} />
        <WalkthroughModal
          isOpen={isWalkthroughOpen}
          onClose={() => setIsWalkthroughOpen(false)}
        />
      </>
    );
  }

  // User authenticated -> Private Dashboard
  return (
    <div className="min-h-screen bg-stone-100 flex flex-col overflow-hidden">
      <Navbar
        user={currentUser}
        onNewReflection={handleNewReflection}
        onOpenWalkthrough={() => setIsWalkthroughOpen(true)}
        persistenceStatus={persistenceStatus}
      />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-7xl w-full mx-auto shadow-sm">
        <JournalSidebar
          entries={entries}
          selectedEntryId={selectedEntryId}
          onSelectEntry={handleSelectEntry}
          onDeleteEntry={handleDeleteEntry}
          onNewReflection={handleNewReflection}
          loading={loadingEntries}
        />

        <ReflectionWorkspace
          currentEntry={activeEntry}
          onSaveEntry={handleSaveEntry}
          persistenceStatus={persistenceStatus}
          onRetrySave={handleRetrySave}
          userId={currentUser.uid}
        />
      </div>

      <WalkthroughModal
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
      />
    </div>
  );
}
