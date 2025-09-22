import React from 'react';
import type { useAppStateManager } from '../hooks/useAppStateManager';
import MarkdownPreview from './MarkdownPreview';
import ClarificationPanel from './ClarificationPanel';
import DiffPanel from './DiffPanel';
import ResultOutput from './ResultOutput';
import { SparklesIcon, BugAntIcon, WandSparklesIcon } from './Icons';
import { extractFilenameFromMarkdown } from '../utils';

type StateManager = ReturnType<typeof useAppStateManager>;

interface ResultsPanelProps {
  stateManager: StateManager;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({ stateManager }) => {
  const {
    isLoading, isGeneratingQuestions, isRefining, isGeneratingDiff, isFinalizing,
    progressMessage,
    error,
    analysisHistory,
    questionsMap, answeredQuestionsMap, customInstructionsMap, diffMap,
    latestRefiningSourceId, latestDiffingSourceId, finalizingSourceId,
    exchangeRateInfo,
    handleCopy, handleDownload,
    handleGenerateQuestions, handleRefineDocument, handleGenerateDiff, handleFinalizeDocument,
    isAnyLoading,
  } = stateManager;

  return (
    <>
      {isAnyLoading && !isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 flex items-center justify-center">
           <svg className="animate-spin h-6 w-6 text-primary-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
           <p className="ml-4 text-lg font-semibold">{progressMessage || 'AIが処理中です...'}</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-4 rounded-r-lg shadow-lg" role="alert">
          <p className="font-bold">エラーが発生しました</p>
          <p>{error}</p>
        </div>
      )}
      
      {isLoading ? (
         <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8">
            <MarkdownPreview markdown="" isLoading={true} progressMessage={progressMessage} />
         </div>
      ) : analysisHistory.length === 0 ? (
         <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8">
           <MarkdownPreview markdown="" isLoading={false} progressMessage="" />
         </div>
      ) : null}

      {analysisHistory.map((result, index) => {
        const prevResultId = index > 0 ? analysisHistory[index - 1].id : null;
        const hasQuestions = questionsMap[result.id] && questionsMap[result.id].length > 0;
        const hasDiff = diffMap[result.id];
        const isLatestResult = index === analysisHistory.length - 1;

        return (
          <div key={result.id}>
            <ResultOutput 
              result={result} 
              index={index} 
              onCopy={handleCopy} 
              onDownload={(md) => handleDownload(md, extractFilenameFromMarkdown(md))}
              exchangeRateInfo={exchangeRateInfo} 
            />
            
            {isGeneratingDiff && latestDiffingSourceId === result.id && (
              <div className="my-8 flex items-center justify-center p-4">
                <svg className="animate-spin h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span className="ml-2">差分を生成中...</span>
              </div>
            )}

            {hasDiff && (
              <DiffPanel 
                diffMarkdown={diffMap[result.id]} 
                onCopy={() => handleCopy(diffMap[result.id])} 
                onDownload={() => handleDownload(diffMap[result.id], `diff_v${index}.md`)} 
              />
            )}
            
            {isFinalizing && finalizingSourceId === result.id && (
              <div className="my-8 flex items-center justify-center p-4">
                <svg className="animate-spin h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span className="ml-2">ドキュメントを清書中...</span>
              </div>
            )}

            {isRefining && latestRefiningSourceId === result.id && (
               <ClarificationPanel 
                  questions={questionsMap[result.id] || []}
                  answeredQuestions={answeredQuestionsMap[result.id]}
                  initialCustomInstructions={customInstructionsMap[result.id]}
                  onAnswersSubmit={() => {}}
                  isRefining={true}
               />
            )}

            {hasQuestions && !(isRefining && latestRefiningSourceId === result.id) && (
              <ClarificationPanel 
                questions={questionsMap[result.id]} 
                answeredQuestions={answeredQuestionsMap[result.id]}
                initialCustomInstructions={customInstructionsMap[result.id]}
                onAnswersSubmit={(answered, instructions, isFinalizing) => handleRefineDocument(result.id, answered, instructions, isFinalizing)}
                isRefining={isRefining}
              />
            )}
            
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
               {isLatestResult && !hasQuestions && (
                  <button 
                      onClick={() => handleGenerateQuestions(result.id)} 
                      disabled={isAnyLoading}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                      {isGeneratingQuestions ? (
                          <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>質問生成中...</>
                      ) : (
                          <><WandSparklesIcon className="h-5 w-5"/>さらに改良する (AIに質問させる)</>
                      )}
                  </button>
               )}
                {isLatestResult && (
                    <button
                        onClick={() => handleFinalizeDocument(result.id)}
                        disabled={isAnyLoading}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 border border-primary-500 text-primary-600 dark:text-primary-300 dark:border-primary-400 rounded-md hover:bg-primary-50 dark:hover:bg-primary-900/30 disabled:bg-gray-200 disabled:text-gray-500 disabled:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        title="現在のドキュメントから「未確定事項」などのセクションを削除し、最終的な完成版を生成します。"
                    >
                        <SparklesIcon className="h-5 w-5" />
                        ドキュメントを清書
                    </button>
               )}
               {prevResultId && !hasDiff && (
                  <button 
                    onClick={() => handleGenerateDiff(result.id, analysisHistory[0].id)} 
                    disabled={isAnyLoading}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 border-2 border-purple-500 text-purple-600 dark:text-purple-300 dark:border-purple-400 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/30 disabled:bg-gray-200 disabled:text-gray-500 disabled:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                     {isGeneratingDiff ? (
                          <><svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>差分生成中...</>
                     ) : (
                         <><BugAntIcon className="h-5 w-5" />最初の解析結果との差分を確認</>
                     )}
                  </button>
               )}
            </div>

          </div>
        )
      })}
    </>
  );
};

export default ResultsPanel;