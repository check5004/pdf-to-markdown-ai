import React from 'react';
import type { useAppStateManager } from '../hooks/useAppStateManager';
import type { useAuth } from '../hooks/useAuth';

import ModeSwitcher from './ModeSwitcher';
import AnalysisModeSwitcher from './AnalysisModeSwitcher';
import ApiKeyInput from './ApiKeyInput';
import ModelSelector from './ModelSelector';
import FileUpload from './FileUpload';
import PromptSettings from './PromptSettings';
import CollapsibleSection from './CollapsibleSection';
import ThinkingModeSwitcher from './ThinkingModeSwitcher';
import GeminiAuth from './GeminiAuth';
import PdfPreview from './PdfPreview';
import { WandSparklesIcon, BookOpenIcon, PhotoIcon, ExclamationTriangleIcon } from './Icons';
import ModelInfoDisplay from './ModelInfoDisplay';

type StateManager = ReturnType<typeof useAppStateManager>;
type Auth = ReturnType<typeof useAuth>;

interface SettingsPanelProps {
  stateManager: StateManager;
  auth: Auth;
  isGeminiAvailable: boolean;
  onShowDocs: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ stateManager, auth, isGeminiAvailable, onShowDocs }) => {
  const {
    mode, analysisMode, openRouterApiKey, isApiKeyInvalid, openRouterModel, availableModels, isFreeModelSelected, isThinkingEnabled,
    pdfFile, isPdfPreviewOpen,
    isLoading,
    selectedOpenRouterModel,
    mainSettings, qgSettings, refineSettings, diffSettings,
    setMode, setAnalysisMode, setOpenRouterApiKey, setIsApiKeyInvalid, setOpenRouterModel, setIsThinkingEnabled, setIsPdfPreviewOpen,
    handleFileSelect, handleAnalysis,
    isAnalyzeDisabled, showImageCapabilityWarning,
  } = stateManager;

  const { account, isAuthorized, isAuthLoading, authError, handleLogin, handleLogout } = auth;

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8">
        <div className="space-y-6">
          <h2 className="text-xl font-bold border-b pb-2 border-gray-200 dark:border-gray-700">設定</h2>
          <ModeSwitcher mode={mode} setMode={setMode} isGeminiAvailable={isGeminiAvailable} />
          <AnalysisModeSwitcher mode={analysisMode} setMode={setAnalysisMode} />
          
          {mode === 'gemini' && isGeminiAvailable && (
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <GeminiAuth account={account} isAuthorized={isAuthorized} isLoading={isAuthLoading} authError={authError} onLogin={handleLogin} onLogout={handleLogout} />
              {isAuthorized && (
                <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-500 dark:text-yellow-200 flex items-start gap-3" role="alert">
                  <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div><p className="font-bold">Gemini利用時の注意</p><ul className="text-sm list-disc list-inside space-y-1 mt-1"><li>送信されたデータがAIの学習に使用される可能性があります。機密情報は含めないでください。</li><li>1日あたりの利用回数に制限があります。</li></ul></div>
                </div>
              )}
            </div>
          )}
          
          {mode === 'openrouter' && (
            <div className="space-y-4 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <ApiKeyInput apiKey={openRouterApiKey} setApiKey={(key: string) => { setOpenRouterApiKey(key); setIsApiKeyInvalid(false); }} isInvalid={isApiKeyInvalid} />
              
              <div>
                <div className="flex justify-between items-center">
                  <label htmlFor="model-selector-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    モデル
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">おすすめ:</span>
                    <button
                      onClick={() => setOpenRouterModel('openai/gpt-5-mini')}
                      className={`px-2 py-0.5 text-xs font-medium rounded-full border transition-colors ${
                        openRouterModel === 'openai/gpt-5-mini'
                          ? 'bg-primary-600 border-primary-600 text-white'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      OpenAI: GPT-5 Mini
                    </button>
                    <button
                      onClick={() => setOpenRouterModel('google/gemini-2.5-flash')}
                      className={`px-2 py-0.5 text-xs font-medium rounded-full border transition-colors ${
                        openRouterModel === 'google/gemini-2.5-flash'
                          ? 'bg-primary-600 border-primary-600 text-white'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      Google: Gemini 2.5 Flash
                    </button>
                  </div>
                </div>
                <ModelSelector model={openRouterModel} setModel={setOpenRouterModel} models={availableModels} disabled={!openRouterApiKey || availableModels.length === 0} />
              </div>

              <ModelInfoDisplay model={selectedOpenRouterModel} />
               {selectedOpenRouterModel?.supports_thinking && (
                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                  <ThinkingModeSwitcher isEnabled={isThinkingEnabled} setIsEnabled={setIsThinkingEnabled} />
                </div>
              )}
              {showImageCapabilityWarning && (
                <div className="p-3 bg-amber-50 border-l-4 border-amber-400 text-amber-700 dark:bg-amber-900/20 dark:border-amber-500 dark:text-amber-200 flex items-start gap-3" role="alert">
                  <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div><p className="font-bold">モデルの能力に関する警告</p><p className="text-sm">選択中のモデルは画像解析をサポートしていない可能性があります。現在の解析モードで最良の結果を得るには、画像入力アイコン（<PhotoIcon className="h-4 w-4 inline-block -mt-1" />）が付いたモデルを選択してください。</p></div>
                </div>
              )}
              {isFreeModelSelected && (
                <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-500 dark:text-yellow-200 flex items-start gap-3" role="alert">
                  <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div><p className="font-bold">注意</p><p className="text-sm">選択中の無料モデルは、送信されたデータをAIの学習に使用する可能性があります。機密情報を含めないようにしてください。</p></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <CollapsibleSection title="AI設定">
          <PromptSettings
            main={mainSettings}
            qg={qgSettings}
            refine={refineSettings}
            diff={diffSettings}
            mode={mode}
            isGeminiAvailable={isGeminiAvailable}
            availableModels={availableModels}
            openRouterApiKey={openRouterApiKey}
          />
        </CollapsibleSection>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 space-y-8">
        <div className="space-y-6">
          <h2 className="text-xl font-bold border-b pb-2 border-gray-200 dark:border-gray-700">アップロード</h2>
          <FileUpload onFileSelect={handleFileSelect} />
        </div>
        <button onClick={handleAnalysis} disabled={isAnalyzeDisabled} className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all transform hover:scale-105 disabled:scale-100">
          {isLoading ? ( <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>解析中...</> ) : ( <><WandSparklesIcon className="h-6 w-6" />ドキュメントを解析</> )}
        </button>
      </div>
      {pdfFile && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden xl:sticky xl:top-8">
          <CollapsibleSection title="PDFプレビュー" isOpen={isPdfPreviewOpen} onToggle={() => setIsPdfPreviewOpen(!isPdfPreviewOpen)}>
            <PdfPreview file={pdfFile} />
          </CollapsibleSection>
        </div>
      )}
      
      <button onClick={onShowDocs} className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-dashed border-gray-400 text-gray-600 dark:text-gray-400 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
        <BookOpenIcon className="h-5 w-5"/>
        <span>使い方を見る</span>
      </button>
    </>
  );
};

export default SettingsPanel;