
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from './hooks/useAuth';
import { useAppStateManager } from './hooks/useAppStateManager';
import SettingsPanel from './components/SettingsPanel';
import ResultsPanel from './components/ResultsPanel';
import Documentation from './components/Documentation';
import { BugAntIcon } from './components/Icons';

export default function App() {
  const [showDocs, setShowDocs] = useState<boolean>(window.location.hash === '#docs');
  
  const auth = useAuth();
  const isGeminiAvailable = useMemo(() => !!(process.env.API_KEY || process.env.GEMINI_API_KEY), []);
  const stateManager = useAppStateManager({ isGeminiAvailable, isAuthorized: auth.isAuthorized });

  // Sync URL hash with showDocs state
  useEffect(() => {
    if (showDocs) {
      window.location.hash = 'docs';
    } else {
      if (window.location.hash === '#docs') {
        try {
          window.history.replaceState("", document.title, window.location.pathname + window.location.search);
        } catch (e) {
          console.error("Could not remove hash from URL using replaceState:", e);
          window.location.hash = '';
        }
      }
    }
  }, [showDocs]);

  // Listen for hash changes (e.g., browser back/forward buttons)
  useEffect(() => {
    const handleHashChange = () => {
      setShowDocs(window.location.hash === '#docs');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  if (showDocs) {
    return <Documentation onClose={() => setShowDocs(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200 font-sans">
      <main className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary-600 dark:text-primary-400" title="PDF Design Document Analyzer">PDF設計書アナライザー</h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">複雑なPDF設計書をAIでクリーンなMarkdownドキュメントに変換します。</p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
          <div className="space-y-8 xl:col-span-2">
            <SettingsPanel
              stateManager={stateManager}
              auth={auth}
              isGeminiAvailable={isGeminiAvailable}
              onShowDocs={() => setShowDocs(true)}
            />
          </div>
          <div className="space-y-8 xl:col-span-3">
            <ResultsPanel stateManager={stateManager} />
          </div>
        </div>
        
        <footer className="text-center py-6 mt-12 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center gap-4">
            <p>&copy; {new Date().getFullYear()} PDF設計書アナライザー. All Rights Reserved.</p>
            <a
              href="https://forms.gle/97qvaNivZQ84TM1b8"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600 dark:focus:ring-offset-gray-900"
            >
              <BugAntIcon className="h-4 w-4" />
              バグ報告・機能要望
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}