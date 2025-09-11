
import React from 'react';
import { OpenRouterModel } from '../types';
import { DocumentTextIcon, PhotoIcon, MicrophoneIcon, VideoCameraIcon, WrenchScrewdriverIcon, BrainIcon, BookOpenIcon, ArrowUpCircleIcon, ArrowDownCircleIcon, DocumentIcon } from './Icons';
import { formatCost } from '../utils';

const ModelInfoDisplay: React.FC<{ model: OpenRouterModel | undefined; }> = ({ model }) => {
  if (!model) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 space-y-3 animate-fade-in">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{model.name}</h3>
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
          {model.modality_types.includes('pdf_input') && <DocumentIcon className="h-5 w-5" title="PDF Input" />}
          {model.modality_types.includes('text') && <DocumentTextIcon className="h-5 w-5" title="Text Input" />}
          {model.modality_types.includes('image_input') && <PhotoIcon className="h-5 w-5" title="Image Input" />}
          {model.modality_types.includes('audio_input') && <MicrophoneIcon className="h-5 w-5" title="Audio Input" />}
          {model.modality_types.includes('video_input') && <VideoCameraIcon className="h-5 w-5" title="Video Input" />}
          {model.modality_types.includes('tool_use') && <WrenchScrewdriverIcon className="h-5 w-5" title="Tool Use" />}
          {model.supports_thinking && <BrainIcon className="h-5 w-5" title="Thinking Support" />}
        </div>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 -mt-2">{model.description}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center gap-2" title="The maximum number of tokens the model can process in a single request.">
          <BookOpenIcon className="h-5 w-5 text-primary-500" />
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Context</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{model.context_length.toLocaleString()} tokens</p>
          </div>
        </div>
        <div className="flex items-center gap-2" title="The cost for processing the input prompt tokens.">
          <ArrowUpCircleIcon className="h-5 w-5 text-green-500" />
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Prompt Cost</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{formatCost(model.pricing.prompt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2" title="The cost for generating the output completion tokens.">
          <ArrowDownCircleIcon className="h-5 w-5 text-blue-500" />
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Completion Cost</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{formatCost(model.pricing.completion)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelInfoDisplay;