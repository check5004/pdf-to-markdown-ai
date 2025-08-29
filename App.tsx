
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Mode, OpenRouterModel, PromptPreset, AnalysisMode, UsageInfo } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import { analyzeDocumentWithGemini } from './services/geminiService';
import { analyzeDocumentWithOpenRouter, fetchModels } from './services/openRouterService';
import ModeSwitcher from './components/ModeSwitcher';
import AnalysisModeSwitcher from './components/AnalysisModeSwitcher';
import ApiKeyInput from './components/ApiKeyInput';
import ModelSelector from './components/ModelSelector';
import FileUpload from './components/FileUpload';
import MarkdownPreview from './components/MarkdownPreview';
import PromptSettings from './components/PromptSettings';
import CollapsibleSection from './components/CollapsibleSection';
import DebugInfo from './components/DebugInfo';
import UsageInfoDisplay from './components/UsageInfoDisplay';
import ThinkingModeSwitcher from './components/ThinkingModeSwitcher';
import { DocumentIcon, WandSparklesIcon, DownloadIcon, ClipboardIcon, CheckIcon, BookOpenIcon, ArrowUpCircleIcon, ArrowDownCircleIcon, PhotoIcon, DocumentTextIcon, MicrophoneIcon, VideoCameraIcon, WrenchScrewdriverIcon, ExclamationTriangleIcon, BrainIcon } from './components/Icons';

// pdf.js is loaded from CDN, so we need to declare its global object
declare const pdfjsLib: any;

const DEFAULT_PERSONA_PROMPT = `あなたは熟練のソフトウェアアーキテクト兼テクニカルライターです。入力として与えられるPDFは、ExcelからPDF化された外部設計書・詳細設計書で、画像化された表・図・座標的レイアウトを含む場合があります。以下を厳密に実施してください。

- OCRやレイアウト推定を駆使して人間が読むべき意味構造を再構成する
- セクション構造（見出しレベル）を判別し、欠落している見出しがあれば適切に補い、論理的な順序に並べ直す
- 表や箇条書き、番号付き手順、入出力定義、IF/Elseフロー、データ型、インタフェース、制約、非機能要件などを正確に抽出しMarkdownで表現
- 画像化された表はMarkdown表に変換（元の行・列の意味を保つ）。座標ベースの配置のみの情報は、読み手にとって意味のある説明に変換
- ページ番号、章番号、図番号などの識別子があれば保持
- 曖昧な箇所は「未確定事項」として列挙し、根拠や該当ページを添える
- 最終的な出力は「読みやすい日本語のMarkdown文書」とし、完全な見出し構造を持つ

出力は純粋なMarkdownのみ（バッククォートのコードフェンスで囲まない）。`;
const DEFAULT_USER_PROMPT = "以下のPDF（外部設計書・詳細設計書）を統合的に読解し、読者にとって読みやすい完全なMarkdown文書を作成してください。";
const DEFAULT_TEMPERATURE = 0.5;

interface ExchangeRateInfo {
  rate: number;
  lastUpdated: number;
}

const sanitizeFilename = (name: string): string => {
    if (!name) return 'document.md';
    // Remove invalid characters for Windows and Unix-like systems
    let sanitized = name.replace(/[/\\?%*:|"<>]/g, '-');
    // Replace multiple spaces with a single underscore
    sanitized = sanitized.replace(/\s+/g, '_');
    
    // Ensure it ends with .md
    if (!sanitized.toLowerCase().endsWith('.md')) {
        const lastDotIndex = sanitized.lastIndexOf('.');
        if (lastDotIndex > -1) {
            // It has an extension, remove it before adding .md
            sanitized = sanitized.substring(0, lastDotIndex);
        }
        sanitized += '.md';
    }
    // Limit length to avoid issues with filesystems, leaving room for extensions
    return sanitized.substring(0, 250);
};

const extractFilenameFromMarkdown = (markdown: string): string => {
  if (!markdown) return 'document.md';
  const match = markdown.match(/^#\s+([^\n]+)/);
  if (match && match[1]) {
    return sanitizeFilename(match[1].trim());
  }
  return 'document.md';
};


const formatCost = (costStr: string): string => {
  const cost = parseFloat(costStr);
  if (isNaN(cost) || cost === 0) {
    return "Free";
  }
  return `$${cost.toFixed(4)} / 1M tokens`;
};

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


export default function App() {
  const isGeminiAvailable = useMemo(() => !!(process.env.API_KEY || process.env.GEMINI_API_KEY), []);
  
  const [mode, setMode] = useLocalStorage<Mode>('doc-converter-mode', isGeminiAvailable ? Mode.GEMINI : Mode.OPENROUTER);
  const [analysisMode, setAnalysisMode] = useLocalStorage<AnalysisMode>('analysis-mode', 'image-with-text');
  const [openRouterApiKey, setOpenRouterApiKey] = useLocalStorage<string>('openrouter-api-key', '');
  const [isApiKeyInvalid, setIsApiKeyInvalid] = useState<boolean>(false);
  const [openRouterModel, setOpenRouterModel] = useLocalStorage<string>('openrouter-model', '');
  const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>([]);
  const [isFreeModelSelected, setIsFreeModelSelected] = useState<boolean>(false);
  const [isThinkingEnabled, setIsThinkingEnabled] = useLocalStorage<boolean>('thinking-enabled', true);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [markdown, setMarkdown] = useState<string>('');
  const [filename, setFilename] = useState<string>('document.md');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{ request: any; response: any; generationResponse?: any; } | null>(null);
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [exchangeRateInfo, setExchangeRateInfo] = useState<ExchangeRateInfo | null>(null);

  // AI Settings State
  const [personaPrompt, setPersonaPrompt] = useLocalStorage<string>('ai-persona-prompt', DEFAULT_PERSONA_PROMPT);
  const [userPrompt, setUserPrompt] = useLocalStorage<string>('ai-user-prompt', DEFAULT_USER_PROMPT);
  const [temperature, setTemperature] = useLocalStorage<number>('ai-temperature', DEFAULT_TEMPERATURE);
  const [presets, setPresets] = useLocalStorage<PromptPreset[]>('ai-presets', []);
  const [selectedPresetId, setSelectedPresetId] = useLocalStorage<string>('ai-selected-preset-id', 'default');
  
  const selectedOpenRouterModel = React.useMemo(() => {
    if (mode === Mode.OPENROUTER && openRouterModel && availableModels.length > 0) {
      return availableModels.find(m => m.id === openRouterModel);
    }
    return undefined;
  }, [mode, openRouterModel, availableModels]);
  
  useEffect(() => {
    if (!isGeminiAvailable && mode === Mode.GEMINI) {
      setMode(Mode.OPENROUTER);
    }
  }, [isGeminiAvailable, mode, setMode]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'pdfjsLib' in window) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;
    }
  }, []);

  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!response.ok) {
          console.error(`Failed to fetch exchange rate: ${response.statusText}`);
          return;
        }
        const data = await response.json();
        if (data && data.rates && data.rates.JPY && data.time_last_update_unix) {
          setExchangeRateInfo({
            rate: data.rates.JPY,
            lastUpdated: data.time_last_update_unix * 1000,
          });
        } else {
          console.error("Invalid exchange rate API response format.");
        }
      } catch (error) {
        console.error("Could not fetch USD to JPY exchange rate:", error);
      }
    };
    fetchExchangeRate();
  }, []);

  useEffect(() => {
    if (mode !== Mode.OPENROUTER || !openRouterApiKey) {
      setAvailableModels([]);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setProgressMessage('OpenRouterのモデルを取得中...');
    setError('');

    fetchModels(openRouterApiKey)
      .then(models => {
        if (!isCancelled) setAvailableModels(models);
      })
      .catch(err => {
        if (!isCancelled) {
          console.error(err);
          setError('OpenRouterモデルの取得に失敗しました。APIキーを確認してください。');
          setAvailableModels([]);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
          setProgressMessage('');
        }
      });

    return () => { isCancelled = true; };
  }, [mode, openRouterApiKey]);

  useEffect(() => {
    if (availableModels.length > 0) {
      const isSelectedModelAvailable = availableModels.some(m => m.id === openRouterModel);
      if (!isSelectedModelAvailable) {
        setOpenRouterModel(availableModels[0].id);
      }
    }
  }, [availableModels, openRouterModel, setOpenRouterModel]);

  useEffect(() => {
    if (mode === Mode.OPENROUTER && openRouterModel && availableModels.length > 0) {
      const selectedModel = availableModels.find(m => m.id === openRouterModel);
      setIsFreeModelSelected(selectedModel?.name.toLowerCase().includes('free') ?? false);
    } else {
      setIsFreeModelSelected(false);
    }
  }, [mode, openRouterModel, availableModels]);

  const handleAnalysis = useCallback(async () => {
    if (!pdfFile) {
      setError('最初にPDFファイルをアップロードしてください。');
      return;
    }
    if (mode === Mode.GEMINI && !isGeminiAvailable) {
      setError('Gemini APIキーが設定されていないため、Geminiは利用できません。OpenRouterを利用してください。');
      return;
    }
    if (mode === Mode.OPENROUTER && (!openRouterApiKey || !openRouterModel)) {
      setError('OpenRouterのAPIキーを入力し、モデルを選択してください。');
      return;
    }

    setIsApiKeyInvalid(false); // Reset before new analysis
    setIsLoading(true);
    setError('');
    setMarkdown('');
    setFilename('document.md');
    setDebugInfo(null);
    setUsageInfo(null);

    try {
      setProgressMessage('PDFファイルを読み込んでいます...');
      const fileBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
      const numPages = pdf.numPages;
      const pageImages: string[] = [];
      let allTextContent: string | undefined = undefined;
      let textContentBuilder = '';

      for (let i = 1; i <= numPages; i++) {
        setProgressMessage(`${i}/${numPages}ページを処理中...`);
        const page = await pdf.getPage(i);
        
        if (analysisMode === 'image-with-text') {
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            textContentBuilder += `--- Page ${i} ---\n${pageText}\n\n`;
        }

        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({ canvasContext: context, viewport: viewport }).promise;
          pageImages.push(canvas.toDataURL('image/jpeg'));
        }
      }

      if (analysisMode === 'image-with-text') {
        allTextContent = textContentBuilder;
      }
      
      let analysisResponse: { result: string; debug: any; usage: UsageInfo | null };
      if (mode === Mode.GEMINI) {
        setProgressMessage('Geminiで解析中...');
        analysisResponse = await analyzeDocumentWithGemini(userPrompt, pageImages, personaPrompt, temperature, allTextContent);
      } else {
        setProgressMessage(`OpenRouter (${openRouterModel})で解析中...`);

        const isThinkingOn = !!(selectedOpenRouterModel?.supports_thinking && isThinkingEnabled);

        analysisResponse = await analyzeDocumentWithOpenRouter(userPrompt, pageImages, openRouterModel, openRouterApiKey, personaPrompt, temperature, allTextContent, isThinkingOn);
      }
      
      const { result, debug, usage } = analysisResponse;
      setDebugInfo(debug);
      setUsageInfo(usage);

      if (typeof result === 'string') {
        setMarkdown(result);
        setFilename(extractFilenameFromMarkdown(result));
      } else {
        console.error("Unexpected AI response format:", result);
        throw new Error("AIからの応答が予期した形式ではありません。");
      }

    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || '不明なエラー';
      setError(`エラーが発生しました: ${errorMessage}`);
      if (mode === Mode.OPENROUTER && (String(errorMessage).includes('401') || String(errorMessage).toLowerCase().includes('auth'))) {
        setIsApiKeyInvalid(true);
      }
    } finally {
      setIsLoading(false);
      setProgressMessage('');
    }
  }, [pdfFile, mode, analysisMode, openRouterApiKey, openRouterModel, personaPrompt, userPrompt, temperature, selectedOpenRouterModel, isThinkingEnabled, isGeminiAvailable]);

  const handleDownload = useCallback(() => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename; // Already sanitized by extractFilenameFromMarkdown
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [markdown, filename]);

  const handleCopy = useCallback(() => {
    if (isCopied || !markdown) return;
    navigator.clipboard.writeText(markdown)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy markdown: ', err);
        alert('クリップボードへのコピーに失敗しました。');
      });
  }, [markdown, isCopied]);

  const handleSavePreset = useCallback((name: string) => {
    if (!name.trim()) {
      alert('プリセット名を入力してください。');
      return;
    }
    if (presets.some(p => p.name === name.trim())) {
      if (!confirm(`プリセット "${name.trim()}" は既に存在します。上書きしますか？`)) {
        return;
      }
    }

    const newPreset: PromptPreset = {
      id: self.crypto.randomUUID(),
      name: name.trim(),
      personaPrompt: personaPrompt,
      userPrompt,
      temperature,
    };
    
    const updatedPresets = presets.filter(p => p.name !== name.trim());
    setPresets([...updatedPresets, newPreset]);
    setSelectedPresetId(newPreset.id);
    alert(`プリセット "${name.trim()}" を保存しました。`);
  }, [presets, personaPrompt, userPrompt, temperature, setPresets, setSelectedPresetId]);

  const handleLoadPreset = useCallback((id: string) => {
    setSelectedPresetId(id);
    if (id === 'default') {
      setPersonaPrompt(DEFAULT_PERSONA_PROMPT);
      setUserPrompt(DEFAULT_USER_PROMPT);
      setTemperature(DEFAULT_TEMPERATURE);
    } else {
      const preset = presets.find(p => p.id === id);
      if (preset) {
        setPersonaPrompt(preset.personaPrompt);
        setUserPrompt(preset.userPrompt);
        setTemperature(preset.temperature);
      }
    }
  }, [presets, setPersonaPrompt, setUserPrompt, setTemperature, setSelectedPresetId]);

  const handleDeletePreset = useCallback((id: string) => {
    if (!confirm('このプリセットを削除してもよろしいですか？')) return;
    setPresets(presets.filter(p => p.id !== id));
    if (selectedPresetId === id) {
      handleLoadPreset('default');
    }
  }, [presets, selectedPresetId, setPresets, handleLoadPreset]);

  
  const isAnalyzeDisabled = isLoading || !pdfFile || (mode === Mode.OPENROUTER && (!openRouterApiKey || !openRouterModel));

  const showImageCapabilityWarning = 
    mode === Mode.OPENROUTER &&
    (analysisMode === 'image-only' || analysisMode === 'image-with-text') &&
    selectedOpenRouterModel &&
    !selectedOpenRouterModel.modality_types.includes('image_input');

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200 font-sans">
      <main className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary-600 dark:text-primary-400">PDF設計書アナライザー</h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">複雑なPDF設計書をAIでクリーンなMarkdownドキュメントに変換します。</p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start">
          {/* --- Left Column: Inputs & Settings --- */}
          <div className="space-y-8 xl:col-span-2">
            {/* Settings Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8">
              <div className="space-y-6">
                <h2 className="text-xl font-bold border-b pb-2 border-gray-200 dark:border-gray-700">設定</h2>
                <ModeSwitcher mode={mode} setMode={setMode} isGeminiAvailable={isGeminiAvailable} />
                <AnalysisModeSwitcher mode={analysisMode} setMode={setAnalysisMode} />
                
                {mode === Mode.GEMINI && isGeminiAvailable && (
                    <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-500 dark:text-yellow-200 flex items-start gap-3" role="alert">
                        <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Gemini利用時の注意</p>
                          <ul className="text-sm list-disc list-inside space-y-1 mt-1">
                            <li>送信されたデータがAIの学習に使用される可能性があります。機密情報は含めないでください。</li>
                            <li>1日あたりの利用回数に制限があります。</li>
                            <li>頻繁にご利用の場合は、OpenRouterのご利用を推奨します。</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                )}
                
                {mode === Mode.OPENROUTER && (
                  <div className="space-y-4 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                    <ApiKeyInput 
                      apiKey={openRouterApiKey}
                      setApiKey={(key: string) => {
                        setOpenRouterApiKey(key);
                        setIsApiKeyInvalid(false);
                      }}
                      isInvalid={isApiKeyInvalid} 
                    />
                    <ModelSelector
                      model={openRouterModel}
                      setModel={setOpenRouterModel}
                      models={availableModels}
                      disabled={!openRouterApiKey || availableModels.length === 0}
                    />
                    <ModelInfoDisplay model={selectedOpenRouterModel} />
                     {selectedOpenRouterModel?.supports_thinking && (
                      <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                        <ThinkingModeSwitcher
                          isEnabled={isThinkingEnabled}
                          setIsEnabled={setIsThinkingEnabled}
                        />
                      </div>
                    )}
                    {showImageCapabilityWarning && (
                      <div className="p-3 bg-amber-50 border-l-4 border-amber-400 text-amber-700 dark:bg-amber-900/20 dark:border-amber-500 dark:text-amber-200 flex items-start gap-3" role="alert">
                        <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">モデルの能力に関する警告</p>
                          <p className="text-sm">選択中のモデルは画像解析をサポートしていない可能性があります。現在の解析モードで最良の結果を得るには、画像入力アイコン（<PhotoIcon className="h-4 w-4 inline-block -mt-1" />）が付いたモデルを選択してください。</p>
                        </div>
                      </div>
                    )}
                    {isFreeModelSelected && (
                      <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-500 dark:text-yellow-200 flex items-start gap-3" role="alert">
                        <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">注意</p>
                          <p className="text-sm">選択中の無料モデルは、送信されたデータをAIの学習に使用する可能性があります。機密情報を含めないようにしてください。</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Upload Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 space-y-8">
              <div className="space-y-6">
                <h2 className="text-xl font-bold border-b pb-2 border-gray-200 dark:border-gray-700">アップロード</h2>
                <FileUpload onFileSelect={setPdfFile} />
              </div>

              <button
                onClick={handleAnalysis}
                disabled={isAnalyzeDisabled}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all transform hover:scale-105 disabled:scale-100"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{progressMessage || '解析中...'}</span>
                  </>
                ) : (
                  <>
                    <WandSparklesIcon className="h-5 w-5" />
                    <span>ドキュメントを解析</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Settings Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                <CollapsibleSection title="AI設定（任意）">
                  <PromptSettings
                    personaPrompt={personaPrompt}
                    setPersonaPrompt={setPersonaPrompt}
                    userPrompt={userPrompt}
                    setUserPrompt={setUserPrompt}
                    temperature={temperature}
                    setTemperature={setTemperature}
                    presets={presets}
                    selectedPresetId={selectedPresetId}
                    onSavePreset={handleSavePreset}
                    onLoadPreset={handleLoadPreset}
                    onDeletePreset={handleDeletePreset}
                  />
                </CollapsibleSection>
            </div>
          </div>

          {/* --- Right Column: Output --- */}
          <div className="space-y-8 xl:col-span-3 xl:sticky xl:top-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8">
              <div className="flex justify-between items-center border-b pb-2 mb-4 border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <DocumentIcon className="h-6 w-6" />
                  解析結果
                </h2>
                {!isLoading && markdown && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopy}
                      disabled={isCopied}
                      className={`flex items-center gap-1.5 px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                        isCopied
                          ? 'bg-green-600 focus:ring-green-500 cursor-default'
                          : 'bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 focus:ring-gray-500'
                      }`}
                      title={isCopied ? "コピーしました！" : "Markdownをコピー"}
                    >
                      {isCopied ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
                      <span className="hidden sm:inline">{isCopied ? 'コピー完了' : 'コピー'}</span>
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800 transition-all"
                      title="Markdownをダウンロード"
                    >
                      <DownloadIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">ダウンロード</span>
                    </button>
                  </div>
                )}
              </div>
              
              {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-4" role="alert">
                  <p className="font-bold">エラー</p>
                  <p>{error}</p>
                </div>
              )}

              <MarkdownPreview markdown={markdown} isLoading={isLoading} progressMessage={progressMessage} />

              {usageInfo && !isLoading && (
                <div className="mt-6">
                  <UsageInfoDisplay usage={usageInfo} exchangeRateInfo={exchangeRateInfo} />
                </div>
              )}
            </div>

            {debugInfo && !isLoading && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                <DebugInfo debugInfo={debugInfo} />
              </div>
            )}
          </div>
        </div>

        <footer className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>React, Tailwind CSS, Gemini, OpenRouter を利用しています。</p>
        </footer>
      </main>
    </div>
  );
}
