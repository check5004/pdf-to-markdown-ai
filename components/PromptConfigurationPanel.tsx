import React, { useRef, useEffect, useState } from 'react';
import { PromptPreset, Mode, OpenRouterModel } from '../types';
import { SaveIcon, TrashIcon, ExclamationTriangleIcon, InformationCircleIcon, ChevronDownIcon } from './Icons';
import ModelSelector from './ModelSelector';

interface PromptConfigurationPanelProps {
  // State for prompts
  personaPrompt: string;
  setPersonaPrompt: (value: string) => void;
  userPrompt: string;
  setUserPrompt: (value: string) => void;
  temperature: number;
  setTemperature: (value: number) => void;
  
  // State for presets
  presets: PromptPreset[];
  selectedPresetId: string;
  setSelectedPresetId: (value: string) => void;
  onSavePreset: (name: string) => void;
  onLoadPreset: (id: string) => void;
  onDeletePreset: (id: string) => void;

  // State for model selection
  mode: Mode;
  isGeminiAvailable: boolean;
  openRouterModel?: string;
  setOpenRouterModel?: (modelId: string) => void;
  availableModels: OpenRouterModel[];
  openRouterApiKey: string;

  // Preset naming
  presetName: string;
  setPresetName: (name: string) => void;
  
  // Default preset definition
  defaultPreset: PromptPreset;

  showModelSelector?: boolean;
}


const DeleteConfirmationModal: React.FC<{
  preset: PromptPreset | null;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ preset, onConfirm, onCancel }) => {
  if (!preset) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 transition-opacity duration-200"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md transform transition-all duration-200 scale-95 opacity-0 animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 sm:mx-0 sm:h-10 sm:w-10">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
          <div className="mt-0 text-left">
            <h3 id="delete-dialog-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">プリセットの削除</h3>
            <div className="mt-2">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                本当にプリセット「<span className="font-semibold">{preset.name}</span>」を削除しますか？この操作は取り消せません。
              </p>
            </div>
            <div className="mt-4 flex items-start gap-2 p-3 text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700">
                <InformationCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>ヒント:</strong> 削除しても、現在編集中のプロンプト内容は維持されます。同じ内容を別の名前で再度保存することも可能です。
                </span>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-row-reverse gap-3">
          <button
            type="button"
            className="inline-flex w-full justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:w-auto"
            onClick={onConfirm}
          >
            削除
          </button>
          <button
            type="button"
            className="inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-700 px-4 py-2 text-sm font-semibold text-gray-900 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 sm:w-auto"
            onClick={onCancel}
          >
            キャンセル
          </button>
        </div>
      </div>
       <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-scale {
          animation: fadeInScale 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};


const PromptConfigurationPanel: React.FC<PromptConfigurationPanelProps> = ({
  personaPrompt, setPersonaPrompt, userPrompt, setUserPrompt, temperature, setTemperature,
  presets, selectedPresetId, setSelectedPresetId, onSavePreset, onLoadPreset, onDeletePreset,
  mode, isGeminiAvailable, openRouterModel, setOpenRouterModel, availableModels, openRouterApiKey,
  presetName, setPresetName, defaultPreset, showModelSelector = true
}) => {
  const [deleteCandidate, setDeleteCandidate] = useState<PromptPreset | null>(null);
  const [isCustomPresetsOpen, setIsCustomPresetsOpen] = useState(false);

  const handleSaveClick = () => {
    onSavePreset(presetName || presets.find(p => p.id === selectedPresetId)?.name || '');
  };

  const uniqueId = React.useId();
  const pristineState = useRef<Pick<PromptPreset, 'name' | 'personaPrompt' | 'userPrompt' | 'temperature'> | null>(null);

  useEffect(() => {
    if (selectedPresetId === 'custom') {
      return;
    }
    if (selectedPresetId === 'default') {
      pristineState.current = defaultPreset;
      setPresetName('');
    } else {
      const preset = presets.find(p => p.id === selectedPresetId);
      if (preset) {
        pristineState.current = preset;
        setPresetName(preset.name);
      } else {
        pristineState.current = null;
        setPresetName('');
      }
    }
  }, [selectedPresetId, presets, setPresetName, defaultPreset]);
  
  useEffect(() => {
    if (!pristineState.current || selectedPresetId === 'custom') {
      return;
    }
    const isModified =
      personaPrompt !== pristineState.current.personaPrompt ||
      userPrompt !== pristineState.current.userPrompt ||
      temperature !== pristineState.current.temperature;
    if (isModified) {
      setSelectedPresetId('custom');
      setPresetName(`${pristineState.current.name}のコピー`);
    }
  }, [personaPrompt, userPrompt, temperature, selectedPresetId, setSelectedPresetId, setPresetName]);

  const handleDeleteConfirm = () => {
    if (deleteCandidate) {
      onDeletePreset(deleteCandidate.id);
      setDeleteCandidate(null);
    }
  };

  return (
    <div className="space-y-6">
      <DeleteConfirmationModal 
        preset={deleteCandidate}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteCandidate(null)}
      />

      {showModelSelector && mode === Mode.OPENROUTER && openRouterModel !== undefined && setOpenRouterModel && (
        <div>
          <ModelSelector
            model={openRouterModel}
            setModel={setOpenRouterModel}
            models={availableModels}
            disabled={!openRouterApiKey || availableModels.length === 0}
          />
        </div>
      )}

      {!showModelSelector && (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                使用モデル
            </label>
            <div className="mt-1 px-3 py-2 w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md">
                <p className="text-sm text-gray-800 dark:text-gray-200 truncate" title={mode === Mode.GEMINI ? 'Gemini 2.5 Flash' : availableModels.find(m => m.id === openRouterModel)?.name || openRouterModel}>
                    {mode === Mode.GEMINI 
                        ? 'Gemini 2.5 Flash' 
                        : availableModels.find(m => m.id === openRouterModel)?.name || openRouterModel || 'N/A'}
                </p>
            </div>
        </div>
      )}

      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-700/50 dark:border-gray-600 space-y-4">
        <h4 className="text-md font-semibold">プリセット管理</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label htmlFor={`preset-select-${uniqueId}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              プリセットの読み込み
            </label>
            <select
              id={`preset-select-${uniqueId}`}
              value={selectedPresetId}
              onChange={(e) => onLoadPreset(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              {selectedPresetId === 'custom' && (
                <option value="custom" disabled>
                  カスタム設定 (未保存)
                </option>
              )}
              <option value="default">デフォルト設定</option>
              {presets.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`preset-name-${uniqueId}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              現在の設定を保存
            </label>
            <div className="flex items-center gap-2 mt-1">
              <input
                id={`preset-name-${uniqueId}`}
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="新しいプリセット名..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500"
              />
              <button onClick={handleSaveClick} className="p-2 text-white bg-primary-600 rounded-md hover:bg-primary-700" title="プリセットを保存">
                <SaveIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
         {presets.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setIsCustomPresetsOpen(prev => !prev)}
              className="w-full flex justify-between items-center text-left text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-expanded={isCustomPresetsOpen}
            >
              <span>カスタムプリセットの管理 ({presets.length})</span>
              <ChevronDownIcon
                className={`h-5 w-5 transform transition-transform text-gray-500 dark:text-gray-400 ${isCustomPresetsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {isCustomPresetsOpen && (
              <>
                <style>{`
                    @keyframes fadeInDown {
                      from { opacity: 0; transform: translateY(-10px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                    .animate-fade-in-down {
                      animation: fadeInDown 0.2s ease-out forwards;
                    }
                `}</style>
                <ul className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-1 bg-white dark:bg-gray-800/50 dark:border-gray-500 animate-fade-in-down">
                  {presets.map(p => (
                    <li key={p.id} className="flex justify-between items-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">
                      <span className="truncate" title={p.name}>{p.name}</span>
                      <button 
                        onClick={() => setDeleteCandidate(p)} 
                        className="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400 flex-shrink-0 ml-2" 
                        title={`「${p.name}」を削除`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor={`persona-prompt-${uniqueId}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            AIの役割/ペルソナ
          </label>
          <textarea
            id={`persona-prompt-${uniqueId}`}
            rows={4}
            value={personaPrompt}
            onChange={(e) => setPersonaPrompt(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor={`user-prompt-${uniqueId}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            ユーザープロンプト
          </label>
          <textarea
            id={`user-prompt-${uniqueId}`}
            rows={6}
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor={`temperature-${uniqueId}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Temperature: <span className="font-semibold">{temperature.toFixed(2)}</span>
          </label>
          <input
            id={`temperature-${uniqueId}`}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
        </div>
      </div>
    </div>
  );
};

export default PromptConfigurationPanel;