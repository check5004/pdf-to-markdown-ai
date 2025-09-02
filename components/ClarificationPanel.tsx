
import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { WandSparklesIcon, ChevronDownIcon } from './Icons';

interface ClarificationPanelProps {
  questions: Question[];
  answeredQuestions?: Question[] | null;
  onAnswersSubmit: (answeredQuestions: Question[]) => void;
  isRefining: boolean;
}

const ClarificationPanel: React.FC<ClarificationPanelProps> = ({ questions, answeredQuestions, onAnswersSubmit, isRefining }) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const initialAnswers: Record<string, string> = {};
    const sourceQuestions = answeredQuestions || questions;
    sourceQuestions.forEach(q => {
      initialAnswers[q.id] = q.answer || '';
    });
    setAnswers(initialAnswers);
  }, [questions, answeredQuestions]);
  
  useEffect(() => {
    if (isRefining) {
      setIsOpen(false);
    }
  }, [isRefining]);

  const handleAnswerChange = (id: string, value: string) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = () => {
    const answeredQuestions = questions.map(q => ({
      ...q,
      answer: answers[q.id] || '',
    }));
    onAnswersSubmit(answeredQuestions);
  };
  
  const allQuestionsAnswered = questions.every(q => (answers[q.id] || '').trim() !== '');

  return (
    <div className="my-8 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 rounded-r-lg animate-fade-in shadow-md transition-all">
       <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
       <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        aria-expanded={isOpen}
      >
        <h3 className="text-xl font-bold text-blue-800 dark:text-blue-200 flex items-center gap-2">
          <span>AIからの確認事項</span>
          {isRefining && !isOpen && (
             <svg className="animate-spin h-5 w-5 text-blue-600 dark:text-blue-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
        </h3>
        <ChevronDownIcon
          className={`h-6 w-6 transform transition-transform text-blue-600 dark:text-blue-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="p-6 pt-2 space-y-6">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            AIがドキュメントをより正確に理解するために、以下の点について追記・修正してください。
          </p>
          <div className="space-y-6">
            {questions.map((q, index) => (
              <div key={q.id}>
                <label htmlFor={`question-${q.id}`} className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                  {index + 1}. {q.question}
                </label>
                <textarea
                  id={`question-${q.id}`}
                  rows={3}
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-500 dark:text-white"
                  placeholder="回答を入力..."
                />
                {q.suggestions && q.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {q.suggestions.map((suggestion, sIndex) => (
                      <button
                        key={sIndex}
                        onClick={() => handleAnswerChange(q.id, suggestion)}
                        className="px-3 py-1 text-xs font-medium text-primary-800 bg-primary-100 rounded-full hover:bg-primary-200 dark:bg-primary-900/50 dark:text-primary-200 dark:hover:bg-primary-900/80 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isRefining}
              className="flex items-center justify-center gap-2 px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
            >
              {isRefining ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>改良中...</span>
                </>
              ) : (
                <>
                  <WandSparklesIcon className="h-5 w-5" />
                  <span>回答を元にドキュメントを改良</span>
                </>
              )}
            </button>
          </div>
          {!allQuestionsAnswered && !isRefining && (
              <p className="text-xs text-yellow-700 dark:text-yellow-400 text-right -mt-4">
                すべての質問に回答すると、より精度の高い結果が期待できます。
              </p>
            )}
        </div>
      )}
    </div>
  );
};

export default ClarificationPanel;
