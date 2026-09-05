export type ReflectionMode = 'reflect' | 'summarize' | 'brainstorm' | 'action_items';

export interface JournalTurn {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  mode?: ReflectionMode;
  modelUsed?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  turns: JournalTurn[];
  tags?: string[];
  mode: ReflectionMode;
  summaryPreview?: string;
}

export interface AuthUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type PersistenceStatus = 'idle' | 'saving' | 'saved' | 'error';
