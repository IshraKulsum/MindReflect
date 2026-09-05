import React, { useState } from 'react';
import { X, CheckCircle2, Shield, BrainCircuit, Database, Lock, Key } from 'lucide-react';

interface WalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TestCase {
  id: string;
  title: string;
  category: 'auth' | 'journal' | 'gemini' | 'firestore' | 'security';
  steps: string[];
  expectedResult: string;
}

const TEST_CASES: TestCase[] = [
  {
    id: 'TC-1',
    title: 'Landing Page & Google Authentication',
    category: 'auth',
    steps: [
      'Navigate to the application root URL.',
      'Verify the welcoming landing page is rendered with features and "Sign In with Google" button.',
      'Click "Sign In with Google" (or "Continue with Google").',
      'Select a Google account in the popup.',
    ],
    expectedResult:
      'User is authenticated securely via Firebase Auth without storing passwords; landing page automatically transitions to the Private Dashboard.',
  },
  {
    id: 'TC-2',
    title: 'Private Dashboard Entry & Profile Display',
    category: 'auth',
    steps: [
      'Observe the top navigation bar after login.',
      'Verify the user avatar, name, and email match the authenticated Google identity.',
      'Check the "Isolated Firestore" security badge in the header.',
    ],
    expectedResult:
      'Personal identity is displayed accurately and session is initialized in state.',
  },
  {
    id: 'TC-3',
    title: 'Compose Multi-Turn Journal Reflection',
    category: 'journal',
    steps: [
      'In the reflection workspace, type an initial thought or click an Inspiration Prompt.',
      'Press "Cmd+Enter" or click "Reflect with AI".',
      'Observe the prompt added to the chat stream immediately with a timestamp.',
      'When Gemini responds, type a follow-up answer or counter-thought.',
      'Submit the follow-up turn.',
    ],
    expectedResult:
      'Multi-turn dialogue maintains context and persists both user turns and AI replies in chronological sequence.',
  },
  {
    id: 'TC-4',
    title: 'Reflection Modes: Synthesize, Brainstorm & Action Items',
    category: 'gemini',
    steps: [
      'In the workspace top bar, switch between modes: "Reflect", "Synthesize", "Brainstorm", and "Action Items".',
      'Submit a journal entry under "Synthesize" or "Action Items".',
      'Review the structured output rendered with markdown headings and bullet points.',
    ],
    expectedResult:
      'Gemini dynamically adapts system instructions to provide summaries, brainstorming ideas, or pragmatic action items tailored to the chosen mode.',
  },
  {
    id: 'TC-5',
    title: 'Cloud Firestore Isolation & Undefined-Stripping',
    category: 'firestore',
    steps: [
      'After submitting a reflection, observe the sync status ("Saving to Firestore" -> "Sync Verified").',
      'Verify the document is saved to /users/{userId}/interactions/{interactionId}.',
      'Verify payload contains zero undefined attributes via the sanitizer.',
      'If network fails, verify the error banner displays with an explicit "Retry Save" button.',
    ],
    expectedResult:
      'Interaction is safely written to Firestore. Enforced by rules: request.auth.uid == userId ensures no cross-user reads or writes.',
  },
  {
    id: 'TC-6',
    title: 'Journal History, Search & Deletion',
    category: 'firestore',
    steps: [
      'Check the left sidebar listing past reflection sessions.',
      'Type keywords into the search bar at the top of the sidebar.',
      'Click on a past entry to reload its complete conversation history.',
      'Click the trash icon to delete an entry with confirmation.',
    ],
    expectedResult:
      'Past reflections load reliably, filter in real-time, and can be selected or removed safely.',
  },
  {
    id: 'TC-7',
    title: 'Gemini Resilient Fallback Ladder',
    category: 'security',
    steps: [
      'Backend evaluates generateContentWithFallback with: gemini-3.6-flash -> gemini-3.1-flash-lite -> gemini-flash-latest -> gemini-3.7-flash.',
      'Simulate high-concurrency or transient 503/429 status codes.',
    ],
    expectedResult:
      'Backend gracefully transitions down the fallback chain before failing, ensuring high availability.',
  },
];

export const WalkthroughModal: React.FC<WalkthroughModalProps> = ({ isOpen, onClose }) => {
  const [completedTests, setCompletedTests] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const toggleTest = (id: string) => {
    setCompletedTests((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const completedCount = Object.values(completedTests).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div>
            <h2 className="text-base font-serif font-bold text-stone-900 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-emerald-700" />
              <span>Functional Verification &amp; Test Walkthrough</span>
            </h2>
            <p className="text-xs text-stone-500">
              Interactive test cases covering all 6 user flows and security requirements.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-stone-100/60 border-b border-stone-200 flex items-center justify-between text-xs">
          <span className="font-medium text-stone-700">
            Testing Progress: {completedCount} of {TEST_CASES.length} Verified
          </span>
          <div className="w-32 bg-stone-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-600 h-2 transition-all duration-300"
              style={{ width: `${(completedCount / TEST_CASES.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Test List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-left">
          {TEST_CASES.map((tc) => {
            const isDone = Boolean(completedTests[tc.id]);
            return (
              <div
                key={tc.id}
                className={`p-4 rounded-xl border transition-all ${
                  isDone
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-white border-stone-200 hover:border-stone-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleTest(tc.id)}
                      className="text-stone-400 hover:text-emerald-600 focus:outline-none"
                    >
                      <CheckCircle2
                        className={`w-5 h-5 ${
                          isDone ? 'text-emerald-600 fill-emerald-100' : 'text-stone-300'
                        }`}
                      />
                    </button>
                    <span className="font-mono text-xs font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                      {tc.id}
                    </span>
                    <h3 className="font-semibold text-stone-900 text-sm">{tc.title}</h3>
                  </div>

                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                    {tc.category}
                  </span>
                </div>

                <div className="pl-7 space-y-2 text-xs text-stone-600">
                  <div>
                    <span className="font-semibold text-stone-700">Steps to Execute:</span>
                    <ol className="list-decimal list-inside space-y-0.5 mt-1 text-stone-600">
                      {tc.steps.map((step, sIdx) => (
                        <li key={sIdx}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200/80">
                    <span className="font-semibold text-stone-800">Expected Outcome: </span>
                    <span>{tc.expectedResult}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
          <span className="text-xs text-stone-500">
            Automated test scripts can replicate these 7 test cases directly.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
