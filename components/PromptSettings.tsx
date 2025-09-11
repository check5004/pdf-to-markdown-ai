import React, { useState } from 'react';
import { PromptPreset, Mode, OpenRouterModel } from '../types';
import { ArrowPathIcon, DocumentDuplicateIcon } from './Icons';
import PromptConfigurationPanel from './PromptConfigurationPanel';
import SettingsImportExportModal from './SettingsImportExportModal';

type SettingType = 'main' | 'qg' | 'refine' | 'diff';

interface PromptSettingsProps {
  // Main Analysis Settings
  main: {
    personaPrompt: string; setPersonaPrompt: (v: string) => void;
    userPrompt: string; setUserPrompt: (v: string) => void;
    temperature: number; setTemperature: (v: number) => void;
    presets: PromptPreset[]; selectedPresetId: string; setSelectedPresetId: (v: string) => void;
    onSavePreset: (name: string) => void; onLoadPreset: (id: string) => void; onDeletePreset: (id: string) => void;
    openRouterModel: string;
    presetName: string; setPresetName: (v: string) => void;
    defaultPreset: PromptPreset;
  };
  // Question Generation Settings
  qg: {
    personaPrompt: string; setPersonaPrompt: (v: string) => void;
    userPrompt: string; setUserPrompt: (v: string) => void;
    temperature: number; setTemperature: (v: number) => void;
    presets: PromptPreset[]; selectedPresetId: string; setSelectedPresetId: (v: string) => void;
    onSavePreset: (name: string) => void; onLoadPreset: (id: string) => void; onDeletePreset: (id: string) => void;
    openRouterModel: string; setOpenRouterModel: (id: string) => void;
    presetName: string; setPresetName: (v: string) => void;
    defaultPreset: PromptPreset;
  };
  // Refinement Settings
  refine: {
    personaPrompt: string; setPersonaPrompt: (v: string) => void;
    userPrompt: string; setUserPrompt: (v: string) => void;
    temperature: number; setTemperature: (v: number) => void;
    presets: PromptPreset[]; selectedPresetId: string; setSelectedPresetId: (v: string) => void;
    onSavePreset: (name: string) => void; onLoadPreset: (id: string) => void; onDeletePreset: (id: string) => void;
    openRouterModel: string; setOpenRouterModel: (id: string) => void;
    presetName: string; setPresetName: (v: string) => void;
    defaultPreset: PromptPreset;
  };
  // Diff Generation Settings
  diff: {
    personaPrompt: string; setPersonaPrompt: (v: string) => void;
    userPrompt: string; setUserPrompt: (v: string) => void;
    temperature: number; setTemperature: (v: number) => void;
    presets: PromptPreset[]; selectedPresetId: string; setSelectedPresetId: (v: string) => void;
    onSavePreset: (name: string) => void; onLoadPreset: (id: string) => void; onDeletePreset: (id: string) => void;
    openRouterModel: string; setOpenRouterModel: (id: string) => void;
    presetName: string; setPresetName: (v: string) => void;
    defaultPreset: PromptPreset;
  };
  
  // Shared Info
  mode: Mode;
  isGeminiAvailable: boolean;
  availableModels: OpenRouterModel[];
  openRouterApiKey: string;

  // Import/Export Handlers
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
}

const PromptSettings: React.FC<PromptSettingsProps> = (props) => {
  const [activeTab, setActiveTab] = useState<SettingType>('main');
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);

  const tabClasses = (tab: SettingType) => 
    `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors focus:outline-none ${
      activeTab === tab 
      ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 border-l border-t border-r -mb-px' 
      : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`;

  const getSettingsForTab = (tab: SettingType) => {
    switch (tab) {
        case 'qg': return props.qg;
        case 'refine': return props.refine;
        case 'diff': return props.diff;
        default: return props.main;
    }
  };

  const currentSettings: any = getSettingsForTab(activeTab);

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-2" aria-label="Tabs">
          <button className={tabClasses('main')} onClick={() => setActiveTab('main')}>初期解析</button>
          <button className={tabClasses('qg')} onClick={() => setActiveTab('qg')}>質問生成</button>
          <button className={tabClasses('refine')} onClick={() => setActiveTab('refine')}>ドキュメント改良</button>
          <button className={tabClasses('diff')} onClick={() => setActiveTab('diff')}>差分生成</button>
        </nav>
      </div>

      <div className="pt-4">
        <PromptConfigurationPanel
          key={activeTab} // Use key to force re-mount on tab change
          personaPrompt={currentSettings.personaPrompt}
          setPersonaPrompt={currentSettings.setPersonaPrompt}
          userPrompt={currentSettings.userPrompt}
          setUserPrompt={currentSettings.setUserPrompt}
          temperature={currentSettings.temperature}
          setTemperature={currentSettings.setTemperature}
          presets={currentSettings.presets}
          selectedPresetId={currentSettings.selectedPresetId}
          setSelectedPresetId={currentSettings.setSelectedPresetId}
          onSavePreset={currentSettings.onSavePreset}
          onLoadPreset={currentSettings.onLoadPreset}
          onDeletePreset={currentSettings.onDeletePreset}
          mode={props.mode}
          isGeminiAvailable={props.isGeminiAvailable}
          openRouterModel={activeTab === 'main' ? props.main.openRouterModel : currentSettings.openRouterModel}
          setOpenRouterModel={currentSettings.setOpenRouterModel}
          availableModels={props.availableModels}
          openRouterApiKey={props.openRouterApiKey}
          presetName={currentSettings.presetName}
          setPresetName={currentSettings.setPresetName}
          defaultPreset={currentSettings.defaultPreset}
          showModelSelector={activeTab !== 'main'}
        />
      </div>

       <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-600">
        <button
          onClick={() => setIsImportExportModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          title="現在の全タブのAI設定をJSONファイルとしてエクスポート、またはファイルからインポートします。"
        >
          <DocumentDuplicateIcon className="h-4 w-4" />
          設定のエクスポート / インポート
        </button>
        <button
          onClick={() => currentSettings.onLoadPreset('default')}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <ArrowPathIcon className="h-4 w-4" />
          現在のタブをデフォルトにリセット
        </button>
      </div>

      <SettingsImportExportModal
        isOpen={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
        onExport={props.onExport}
        onImport={props.onImport}
      />
    </div>
  );
};

export default PromptSettings;