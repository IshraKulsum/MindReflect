import React from 'react';
import { BookOpen, LogOut, Plus, CheckCircle, ShieldCheck } from 'lucide-react';
import { AuthUserProfile, PersistenceStatus } from '../types';
import { signOutUser } from '../lib/firebase';

interface NavbarProps {
  user: AuthUserProfile;
  onNewReflection: () => void;
  onOpenWalkthrough: () => void;
  persistenceStatus: PersistenceStatus;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onNewReflection,
  onOpenWalkthrough,
  persistenceStatus,
}) => {
  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-amber-800 flex items-center justify-center text-amber-50 shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-serif font-bold text-stone-900 tracking-tight text-lg">MindReflect</span>
              <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Isolated Firestore</span>
              </span>
            </div>
          </div>
        </div>

        {/* Persistence feedback status in navbar */}
        <div className="hidden md:flex items-center space-x-2 text-xs text-stone-500">
          {persistenceStatus === 'saving' && (
            <span className="inline-flex items-center space-x-1 text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Saving to Firestore...</span>
            </span>
          )}
          {persistenceStatus === 'saved' && (
            <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sync Verified</span>
            </span>
          )}
        </div>

        {/* Actions & User Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            id="nav-new-entry-btn"
            onClick={onNewReflection}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-amber-50 text-xs sm:text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">New Reflection</span>
            <span className="xs:hidden">New</span>
          </button>

          <button
            id="nav-walkthrough-btn"
            onClick={onOpenWalkthrough}
            className="hidden sm:inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-medium transition-colors"
          >
            <span>Test Guide</span>
          </button>

          {/* User Profile */}
          <div className="flex items-center space-x-2 pl-2 border-l border-stone-200">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-8 h-8 rounded-full border border-stone-300 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-stone-900 leading-none truncate max-w-[130px]">
                {user.displayName || 'Journaler'}
              </p>
              <p className="text-[10px] text-stone-500 truncate max-w-[130px]">
                {user.email}
              </p>
            </div>
          </div>

          <button
            id="nav-sign-out-btn"
            onClick={handleSignOut}
            title="Sign Out"
            className="p-1.5 sm:p-2 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
