import React, { useState } from 'react';
import { Search, Calendar, Trash2, MessageSquare, Sparkles, BookOpen } from 'lucide-react';
import { JournalEntry } from '../types';

interface JournalSidebarProps {
  entries: JournalEntry[];
  selectedEntryId: string | null;
  onSelectEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onNewReflection: () => void;
  loading: boolean;
}

export const JournalSidebar: React.FC<JournalSidebarProps> = ({
  entries,
  selectedEntryId,
  onSelectEntry,
  onDeleteEntry,
  onNewReflection,
  loading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredEntries = entries.filter((entry) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const matchesTitle = entry.title?.toLowerCase().includes(query);
    const matchesTurns = entry.turns?.some((t) => t.text?.toLowerCase().includes(query));
    return matchesTitle || matchesTurns;
  });

  const handleDelete = async (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this reflection? This cannot be undone.')) {
      setDeletingId(entryId);
      try {
        await onDeleteEntry(entryId);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return 'Recent';
    }
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 flex flex-col bg-stone-50/70 border-r border-stone-200 h-[calc(100vh-4rem)]">
      {/* Sidebar Header & Search */}
      <div className="p-4 border-b border-stone-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-stone-700" />
            <h2 className="text-sm font-semibold text-stone-900">Your Journal History</h2>
          </div>
          <span className="text-xs text-stone-500 font-mono">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            id="search-reflections-input"
            type="text"
            placeholder="Search reflections &amp; insights..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition-all"
          />
        </div>
      </div>

      {/* Entry List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="p-8 text-center text-stone-400 text-xs">
            <div className="w-6 h-6 border-2 border-stone-300 border-t-amber-800 rounded-full animate-spin mx-auto mb-2" />
            <span>Loading your encrypted history...</span>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mx-auto mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-stone-700 mb-1">
              {searchQuery ? 'No matching reflections found' : 'No journal reflections yet'}
            </p>
            <p className="text-[11px] text-stone-500 max-w-[200px] mx-auto mb-4">
              {searchQuery
                ? 'Try a different search query.'
                : 'Begin by sharing a thought or reflection on the right.'}
            </p>
            {!searchQuery && (
              <button
                id="sidebar-create-first-btn"
                onClick={onNewReflection}
                className="text-xs text-amber-900 bg-amber-100/70 hover:bg-amber-100 font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                Write First Reflection
              </button>
            )}
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isSelected = entry.id === selectedEntryId;
            const turnCount = entry.turns ? entry.turns.length : 0;
            const lastTurn = entry.turns && entry.turns.length > 0 ? entry.turns[entry.turns.length - 1] : null;
            const previewText = lastTurn ? lastTurn.text : 'Empty reflection';

            return (
              <div
                key={entry.id}
                id={`journal-entry-card-${entry.id}`}
                onClick={() => onSelectEntry(entry)}
                className={`group relative p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-white border-amber-800/40 shadow-sm ring-1 ring-amber-800/20'
                    : 'bg-white/80 hover:bg-white border-stone-200/80 hover:border-stone-300 shadow-none'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-xs font-semibold text-stone-900 truncate flex-1">
                    {entry.title || 'Untitled Reflection'}
                  </h3>
                  <button
                    id={`delete-entry-btn-${entry.id}`}
                    onClick={(e) => handleDelete(e, entry.id)}
                    disabled={deletingId === entry.id}
                    title="Delete entry"
                    className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-600 transition-opacity p-1 -mt-1 -mr-1 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed mb-2 font-normal">
                  {previewText}
                </p>

                <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1 border-t border-stone-100">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(entry.updatedAt || entry.createdAt)}</span>
                  </span>
                  <span className="flex items-center space-x-1 text-stone-500">
                    <MessageSquare className="w-3 h-3" />
                    <span>{turnCount} {turnCount === 1 ? 'turn' : 'turns'}</span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
