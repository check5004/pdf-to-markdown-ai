import React, { useState } from 'react';
import { PromptPreset } from '../types.ts';
import { SaveIcon, ArrowPathIcon, TrashIcon } from './Icons.tsx';

interface PromptSettingsProps {
  personaPrompt: string;
  setPersonaPrompt: (value: string) => void;
  userPrompt: string;
  setUserPrompt: (value: string) => void;
  temperature: number;
  setTemperature: (value: number) => void;
  presets: PromptPreset[];
  selectedPresetId: string;
  onSavePreset: (name: string) => void;
  onLoadPreset: (id: string) => void;
  onDeletePreset: (id: string) => void;
}

const PromptSettings: React.FC<PromptSettingsProps> = ({
  personaPrompt, setPersonaPrompt, userPrompt, setUserPrompt, temperature, setTemperature,
  presets, selectedPresetId, onSavePreset, onLoadPreset, onDeletePreset
}) => {
  const [presetName, setPresetName] = useState('');

  const handleSaveClick = () => {
    onSavePreset(presetName || presets.find(p => p.id === selectedPresetId)?.name || '');
  };

  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-700/50 dark:border-gray-600 space-y-4">
        <h3 className="text-lg font-semibold">プリセット管理</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label htmlFor="preset-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              プリセットの読み込み
            </label>
            <div className="flex items-center gap-2 mt-1">
              <select
                id="preset-select"
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
            <label htmlFor="preset-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              現在の設定を保存
            </label>
            <div className="flex items-center gap-2 mt-1">
              <input
                id="preset-name"
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
          <label htmlFor="persona-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            AIの役割/ペルソナ
          </label>
          <textarea
            id="persona-prompt"
            rows={4}
            value={personaPrompt}
            onChange={(e) => setPersonaPrompt(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">ヒント: AIの役割、ペルソナ、全体的な指示（例：「あなたは熟練したテクニカルライターです」）を定義します。</p>
        </div>
        <div>
          <label htmlFor="user-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            ユーザープロンプト
          </label>
          <textarea
            id="user-prompt"
            rows={6}
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
           <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">ヒント: この特定のタスクでAIに何をしてほしいかを記述します。入力（画像）の文脈と、期待される出力形式を説明します。</p>
        </div>
        <div>
          <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Temperature: <span className="font-semibold">{temperature.toFixed(2)}</span>
          </label>
          <input
            id="temperature"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
           <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">ヒント: 値が低いほど（例：0.2）、より決定的で一貫性のある出力になります。値が高いほど（例：0.9）、より創造的で多様な出力になります。</p>
        </div>
      </div>
       <div className="flex justify-end">
        <button
          onClick={() => onLoadPreset('default')}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <ArrowPathIcon className="h-4 w-4" />
          デフォルト設定にリセット
        </button>
      </div>
    </div>
  );
};

export default PromptSettings;