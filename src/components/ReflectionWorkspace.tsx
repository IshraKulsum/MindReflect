import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import {
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  Clock,
  Compass,
  ListTodo,
  FileText,
  Lightbulb,
} from 'lucide-react';
import { JournalEntry, JournalTurn, ReflectionMode, PersistenceStatus } from '../types';

interface ReflectionWorkspaceProps {
  currentEntry: JournalEntry | null;
  onSaveEntry: (entry: JournalEntry) => Promise<void>;
  persistenceStatus: PersistenceStatus;
  onRetrySave: () => void;
  userId: string;
}

const INSPIRATION_PROMPTS = [
  'What decision has been occupying your thoughts today?',
  'What went well today, and what made you feel genuinely grateful?',
  'Reflect on a challenge you recently navigated. What did it teach you?',
  'What is one boundary you need to protect or establish this week?',
];

export const ReflectionWorkspace: React.FC<ReflectionWorkspaceProps> = ({
  currentEntry,
  onSaveEntry,
  persistenceStatus,
  onRetrySave,
  userId,
}) => {
  const [inputPrompt, setInputPrompt] = useState('');
  const [selectedMode, setSelectedMode] = useState<ReflectionMode>(
    currentEntry?.mode || 'reflect'
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [titleText, setTitleText] = useState(currentEntry?.title || 'New Reflection');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [copiedTurnId, setCopiedTurnId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state when active entry changes
  useEffect(() => {
    if (currentEntry) {
      setTitleText(currentEntry.title || 'Untitled Reflection');
      setSelectedMode(currentEntry.mode || 'reflect');
    } else {
      setTitleText('New Reflection');
      setSelectedMode('reflect');
    }
    setErrorMessage(null);
  }, [currentEntry?.id]);

  // Auto-scroll on new turns
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentEntry?.turns?.length, isGenerating]);

  // Auto-resize textarea
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputPrompt(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
    }
  };

  const handleCopy = (turnId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTurnId(turnId);
    setTimeout(() => setCopiedTurnId(null), 2000);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPrompt = inputPrompt.trim();
    if (!cleanPrompt || isGenerating) return;

    setErrorMessage(null);
    setIsGenerating(true);

    const userTurnId = `usr_${Date.now()}`;
    const userTurn: JournalTurn = {
      id: userTurnId,
      role: 'user',
      text: cleanPrompt,
      timestamp: new Date().toISOString(),
      mode: selectedMode,
    };

    // Prepare draft entry object
    const existingTurns = currentEntry?.turns || [];
    const updatedTurnsWithUser = [...existingTurns, userTurn];

    const isInitialTurn = !currentEntry || existingTurns.length === 0;
    let entryId = currentEntry?.id || `entry_${Date.now()}`;
    let resolvedTitle = currentEntry?.title || titleText;

    // Clear input field immediately for UX responsiveness
    setInputPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      // 1. Call server-side Gemini reflection endpoint
      const response = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: cleanPrompt,
          history: existingTurns.map((t) => ({ role: t.role, text: t.text })),
          mode: selectedMode,
          entryTitle: resolvedTitle,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned error ${response.status}`);
      }

      const data = await response.json();
      const modelReply = data.reply || 'No response generated.';
      const modelUsed = data.modelUsed || 'gemini-3.6-flash';

      const modelTurnId = `mod_${Date.now()}`;
      const modelTurn: JournalTurn = {
        id: modelTurnId,
        role: 'model',
        text: modelReply,
        timestamp: new Date().toISOString(),
        mode: selectedMode,
        modelUsed,
      };

      const finalTurns = [...updatedTurnsWithUser, modelTurn];

      // Auto-generate title if this is the first turn
      if (isInitialTurn && resolvedTitle === 'New Reflection') {
        try {
          const titleRes = await fetch('/api/gemini/title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: cleanPrompt }),
          });
          if (titleRes.ok) {
            const titleData = await titleRes.json();
            if (titleData.title) {
              resolvedTitle = titleData.title;
              setTitleText(resolvedTitle);
            }
          }
        } catch {
          resolvedTitle = cleanPrompt.slice(0, 32) + '...';
        }
      }

      const finalEntry: JournalEntry = {
        id: entryId,
        userId,
        title: resolvedTitle,
        createdAt: currentEntry?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        turns: finalTurns,
        mode: selectedMode,
      };

      // 2. Guaranteed Transaction Persistence to Firestore
      await onSaveEntry(finalEntry);
    } catch (err: any) {
      console.error('Error during reflection round:', err);
      setErrorMessage(
        err?.message || 'Failed to complete AI reflection. Your text was preserved.'
      );
      // Restore the user prompt back into the input buffer so user effort is never lost
      setInputPrompt(cleanPrompt);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTitleBlur = async () => {
    setIsEditingTitle(false);
    if (currentEntry && titleText.trim() && titleText !== currentEntry.title) {
      const updated: JournalEntry = {
        ...currentEntry,
        title: titleText.trim(),
        updatedAt: new Date().toISOString(),
      };
      await onSaveEntry(updated);
    }
  };

  const turns = currentEntry?.turns || [];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-white overflow-hidden">
      {/* Workspace Topbar */}
      <div className="px-6 py-3.5 border-b border-stone-200 bg-white/90 backdrop-blur-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3 flex-1 min-w-[240px]">
          {isEditingTitle ? (
            <input
              id="edit-title-input"
              type="text"
              value={titleText}
              onChange={(e) => setTitleText(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
              autoFocus
              className="text-base font-serif font-bold text-stone-900 px-2 py-0.5 border border-amber-600 rounded bg-white focus:outline-none"
            />
          ) : (
            <h2
              id="reflection-entry-title"
              onClick={() => setIsEditingTitle(true)}
              title="Click to rename reflection"
              className="text-base font-serif font-bold text-stone-900 hover:text-amber-900 cursor-pointer truncate max-w-md transition-colors"
            >
              {titleText}
            </h2>
          )}

          {currentEntry && (
            <span className="text-[11px] text-stone-400 font-sans hidden sm:inline">
              (click title to edit)
            </span>
          )}
        </div>

        {/* Reflection Mode Selector Tabs */}
        <div className="flex items-center space-x-1 p-1 rounded-lg bg-stone-100 border border-stone-200 text-xs">
          <button
            id="mode-reflect-btn"
            onClick={() => setSelectedMode('reflect')}
            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-all ${
              selectedMode === 'reflect'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-amber-700" />
            <span>Reflect</span>
          </button>

          <button
            id="mode-summarize-btn"
            onClick={() => setSelectedMode('summarize')}
            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-all ${
              selectedMode === 'summarize'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-700" />
            <span>Synthesize</span>
          </button>

          <button
            id="mode-brainstorm-btn"
            onClick={() => setSelectedMode('brainstorm')}
            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-all ${
              selectedMode === 'brainstorm'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Brainstorm</span>
          </button>

          <button
            id="mode-action-items-btn"
            onClick={() => setSelectedMode('action_items')}
            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-all ${
              selectedMode === 'action_items'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5 text-sky-700" />
            <span>Action Items</span>
          </button>
        </div>
      </div>

      {/* Persistence Error Escalation Banner */}
      {persistenceStatus === 'error' && (
        <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-rose-900 text-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Cloud Firestore sync encountered an issue. Your input is preserved locally.</span>
          </div>
          <button
            id="retry-save-btn"
            onClick={onRetrySave}
            className="inline-flex items-center space-x-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry Save</span>
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mx-6 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center space-x-2 text-amber-900 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Message History Container */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
        {turns.length === 0 ? (
          <div className="max-w-2xl mx-auto py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-100/70 text-amber-900 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl font-medium text-stone-900 mb-2">
              What is on your mind today?
            </h3>
            <p className="text-sm text-stone-600 max-w-lg mx-auto mb-8 leading-relaxed">
              Write as freely as you wish. Gemini 3.6 Flash will provide thoughtful reflections, highlight underlying perspectives, or synthesize key takeaways.
            </p>

            <div className="text-left max-w-lg mx-auto">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                Inspiration Starters
              </p>
              <div className="space-y-2">
                {INSPIRATION_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    id={`inspiration-prompt-${idx}`}
                    onClick={() => {
                      setInputPrompt(prompt);
                      textareaRef.current?.focus();
                    }}
                    className="w-full p-3 text-left text-xs text-stone-700 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 transition-colors flex items-center justify-between group"
                  >
                    <span>{prompt}</span>
                    <Sparkles className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          turns.map((turn) => {
            const isUser = turn.role === 'user';
            return (
              <div
                key={turn.id}
                id={`turn-${turn.id}`}
                className={`flex gap-3 max-w-3xl mx-auto ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-amber-800 text-amber-50 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`group relative rounded-2xl px-5 py-4 text-sm leading-relaxed max-w-[88%] sm:max-w-[80%] ${
                    isUser
                      ? 'bg-stone-900 text-white rounded-tr-xs shadow-xs'
                      : 'bg-stone-50 text-stone-900 border border-stone-200 rounded-tl-xs shadow-xs'
                  }`}
                >
                  {/* Mode / Model Pill */}
                  {!isUser && (
                    <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-stone-200/60 text-[11px] text-stone-500">
                      <span className="font-medium text-amber-900 flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-amber-700" />
                        <span>Gemini Reflection</span>
                      </span>
                      {turn.modelUsed && (
                        <span className="font-mono text-[10px] text-stone-400">
                          {turn.modelUsed}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message Content */}
                  {isUser ? (
                    <div className="whitespace-pre-wrap font-sans">{turn.text}</div>
                  ) : (
                    <div className="markdown-body text-stone-800 font-sans prose prose-stone prose-sm max-w-none">
                      <Markdown>{turn.text}</Markdown>
                    </div>
                  )}

                  {/* Turn Footer */}
                  <div
                    className={`flex items-center justify-between text-[10px] mt-2 pt-1 ${
                      isUser ? 'text-stone-400' : 'text-stone-400'
                    }`}
                  >
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>

                    {!isUser && (
                      <button
                        onClick={() => handleCopy(turn.id, turn.text)}
                        title="Copy text"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-stone-700 rounded"
                      >
                        {copiedTurnId === turn.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-stone-200 text-stone-700 flex items-center justify-center shrink-0 shadow-xs mt-0.5 font-bold text-xs">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Streaming / Generation Indicator */}
        {isGenerating && (
          <div className="flex gap-3 max-w-3xl mx-auto justify-start">
            <div className="w-8 h-8 rounded-xl bg-amber-800 text-amber-50 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="rounded-2xl rounded-tl-xs px-5 py-4 bg-stone-50 border border-stone-200 text-stone-600 text-xs flex items-center space-x-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-amber-700 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-amber-700 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-amber-700 animate-bounce [animation-delay:0.4s]" />
              <span className="pl-2 font-medium">Gemini is reflecting on your entry...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Bottom Bar */}
      <div className="p-4 sm:p-6 border-t border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative rounded-2xl border border-stone-300 bg-stone-50 focus-within:bg-white focus-within:border-stone-500 focus-within:ring-2 focus-within:ring-stone-200 transition-all shadow-xs">
            <textarea
              id="journal-reflection-input"
              ref={textareaRef}
              rows={3}
              value={inputPrompt}
              onChange={handleTextChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={
                turns.length === 0
                  ? 'Write your reflection, thoughts, or raw feelings here...'
                  : 'Continue the thread or respond to Gemini’s questions...'
              }
              className="w-full resize-none bg-transparent px-4 pt-3.5 pb-12 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none"
            />

            <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between pt-1 border-t border-stone-200/50">
              <div className="flex items-center space-x-2 text-[11px] text-stone-400">
                <span>{inputPrompt.length} chars</span>
                <span>&bull;</span>
                <span className="hidden sm:inline">Press Cmd+Enter or click Reflect</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  id="submit-reflection-btn"
                  type="submit"
                  disabled={!inputPrompt.trim() || isGenerating}
                  className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-900 disabled:bg-stone-300 text-white text-xs font-semibold shadow-sm transition-all disabled:cursor-not-allowed"
                >
                  <span>{isGenerating ? 'Thinking...' : 'Reflect with AI'}</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
