
import React from 'react';
import { PromptPreset, Mode, OpenRouterModel } from '../types';
import { SaveIcon, TrashIcon } from './Icons';
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
  
  showModelSelector?: boolean;
}

const PromptConfigurationPanel: React.FC<PromptConfigurationPanelProps> = ({
  personaPrompt, setPersonaPrompt, userPrompt, setUserPrompt, temperature, setTemperature,
  presets, selectedPresetId, onSavePreset, onLoadPreset, onDeletePreset,
  mode, isGeminiAvailable, openRouterModel, setOpenRouterModel, availableModels, openRouterApiKey,
  presetName, setPresetName, showModelSelector = true
}) => {
  const handleSaveClick = () => {
    onSavePreset(presetName || presets.find(p => p.id === selectedPresetId)?.name || '');
  };

  const uniqueId = React.useId();

  return (
    <div className="space-y-6">
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
            <div className="flex items-center gap-2 mt-1">
              <select
                id={`preset-select-${uniqueId}`}
                value={selectedPresetId}
                onChange={(e) => onLoadPreset(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="default">デフォルト設定</option>
                {presets.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {selectedPresetId !== 'default' && (
                <button onClick={() => onDeletePreset(selectedPresetId)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400" title="選択中のプリセットを削除">
                  <TrashIcon className="h-5 w-5" />
                </button>
              )}
            </div>
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
