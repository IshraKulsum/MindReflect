import React, { useState } from 'react';
import { Shield, Sparkles, Database, Lock, ArrowRight, BookOpen, BrainCircuit } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';

interface LandingPageProps {
  onOpenWalkthrough: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenWalkthrough }) => {
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      // Handle popup closed by user gracefully
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in was cancelled. Please try again.');
      } else {
        setAuthError(err.message || 'Failed to authenticate with Google.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col justify-between">
      {/* Top Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-800 flex items-center justify-center text-amber-50 shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold tracking-tight text-stone-900">MindReflect</h1>
            <p className="text-xs text-stone-500 font-sans">AI Reflection &amp; Secure Cloud Journal</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            id="open-walkthrough-landing-btn"
            onClick={onOpenWalkthrough}
            className="text-xs sm:text-sm font-medium text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 transition-colors"
          >
            Verification Guide
          </button>
          <button
            id="google-signin-top-btn"
            onClick={handleSignIn}
            disabled={signingIn}
            className="inline-flex items-center justify-center text-xs sm:text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            {signingIn ? 'Signing In...' : 'Sign In with Google'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-5xl mx-auto px-6 py-12 md:py-16 flex-1 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
          <span>Powered by Gemini 3.6 Flash &amp; Cloud Firestore</span>
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-medium text-stone-900 tracking-tight max-w-3xl leading-snug sm:leading-tight mb-5">
          Introspective journaling with an empathetic, multi-turn AI sounding board.
        </h2>

        <p className="text-stone-600 text-base sm:text-lg max-w-2xl leading-relaxed mb-8">
          Write unfiltered reflections, explore new perspectives, uncover blind spots, and receive structured syntheses. 
          Every thought is cryptographically isolated to your Google account in Cloud Firestore.
        </p>

        {authError && (
          <div className="w-full max-w-md mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm text-left">
            <p className="font-semibold mb-1">Authentication Notice</p>
            <p className="text-xs">{authError}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 mb-14">
          <button
            id="google-signin-hero-btn"
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-3 px-7 py-3.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-amber-50 text-base font-semibold shadow-md transition-all hover:shadow-lg disabled:opacity-60"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{signingIn ? 'Connecting to Google...' : 'Continue with Google'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-sm hover:border-stone-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-100/60 text-amber-900 flex items-center justify-center mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-stone-900 text-base mb-1">Strict User Isolation</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Enforced by Cloud Firestore security rules (<code className="text-xs bg-stone-100 px-1 py-0.5 rounded font-mono">request.auth.uid == userId</code>). No cross-user access is ever permitted.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-sm hover:border-stone-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-100/60 text-emerald-900 flex items-center justify-center mb-4">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-stone-900 text-base mb-1">Multi-Turn Reflection</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Converse through multiple turns with Gemini 3.6 Flash. Switch seamlessly between Deep Reflection, Executive Synthesis, Brainstorming, and Action Items.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-sm hover:border-stone-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-sky-100/60 text-sky-900 flex items-center justify-center mb-4">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-stone-900 text-base mb-1">Durable History &amp; Sync</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Every prompt and AI response is preserved with zero-crash payload sanitation, explicit persistence confirmations, and past entry search.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-2">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>Firebase Google Auth &bull; Firestore Security Rules &bull; Server-side Gemini API</span>
        </div>
        <p>MindReflect &copy; 2026</p>
      </footer>
    </div>
  );
};
