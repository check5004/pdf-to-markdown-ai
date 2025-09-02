
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { Mode, OpenRouterModel, PromptPreset, AnalysisMode, UsageInfo, Question, AnalysisResult } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import { analyzeDocumentWithGemini, generateClarificationQuestions } from './services/geminiService';
import { analyzeDocumentWithOpenRouter, fetchModels, generateClarificationQuestionsWithOpenRouter } from './services/openRouterService';
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
import GeminiAuth from './components/GeminiAuth';
import ClarificationPanel from './components/ClarificationPanel';
import { DocumentIcon, WandSparklesIcon, DownloadIcon, ClipboardIcon, CheckIcon, BookOpenIcon, ArrowUpCircleIcon, ArrowDownCircleIcon, PhotoIcon, DocumentTextIcon, MicrophoneIcon, VideoCameraIcon, WrenchScrewdriverIcon, ExclamationTriangleIcon, BrainIcon, SparklesIcon } from './components/Icons';
import { msalConfig, loginRequest, AUTHORIZED_DOMAIN } from './authConfig';


// pdf.js is loaded from CDN, so we need to declare its global object
declare const pdfjsLib: any;

// Default Prompts
const DEFAULT_PERSONA_PROMPT = `あなたは熟練のソフトウェアアーキテクト兼テクニカルライターです。入力として与えられるPDFは、ExcelからPDF化された外部設計書・詳細設計書で、画像化された表・図・座標的レイアウトを含む場合があります。以下を厳密に実施してください。

- OCRやレイアウト推定を駆使して人間が読むべき意味構造を再構成する
- セクション構造（見出しレベル）を判別し、欠落している見出しがあれば適切に補い、論理的な順序に並べ直す
- 表や箇条書き、番号付き手順、入出力定義、IF/Elseフロー、データ型、インタフェース、制約などを正確に抽出しMarkdownで表現
- 画像化された表はMarkdown表に変換（元の行・列の意味を保つ）。座標ベースの配置のみの情報は、読み手にとって意味のある説明に変換
- ページ番号、章番号、図番号などの識別子があれば保持

- **ドキュメントの品質レビューと「未確定事項」の抽出:**
  - **整合性の確認:** ドキュメント内で内容が矛盾している箇所（例：用語の不統一、機能説明の食い違い）を検出する。
  - **曖昧な記述の特定:** 複数の解釈ができる表現や、具体性に欠ける箇所を特定し、明確化が必要な点を指摘する。
  - **明らかな誤りの指摘:** 明白な誤字脱字や、技術的な記述として考えにくい間違いを指摘する。
  - **重要:** レビューは、提供されたドキュメントの範囲内に限定してください。ドキュメントに記載されていない項目（例：一般的な設計書に必要とされるエラーハンドリングや非機能要件など）を、不足しているものとして勝手に追加で指摘しないでください。あくまで、記載されている内容の中での問題点のみを扱います。
  - 上記のレビューで発見されたすべての問題点を、ドキュメントの末尾に「## 未確定事項」というセクションを設け、箇条書きで具体的にリストアップする。各項目には、根拠や該当箇所を可能な限り添えること。

- 最終的な出力は「読みやすい日本語のMarkdown文書」とし、完全な見出し構造を持つ

出力は純粋なMarkdownのみ（バッククォートのコードフェンスで囲まない）。`;
const DEFAULT_USER_PROMPT = "以下のPDF（外部設計書・詳細設計書）を統合的に読解し、読者にとって読みやすい完全なMarkdown文書を作成してください。";
const DEFAULT_TEMPERATURE = 0.5;

const DEFAULT_QG_PERSONA_PROMPT = `あなたは、経験豊富なITコンサルタント兼システムアーキテクトです。あなたの役割は、提供されたMarkdown形式の設計書をレビューし、その品質を向上させるための的確な質問を生成することです。

**最重要の原則:**
1.  **ドキュメントのスコープを遵守する:** まず、ドキュメントの内容から、それが「外部設計書」「詳細設計書」「テスト仕様書」など、どの設計フェーズのものかを推定してください。あなたの質問は、その推定されたスコープ内に限定しなければなりません。例えば、外部設計書に対して、実装レベルの詳細（具体的なコードやライブラリの選定など）を問うような、フェーズを逸脱した質問は絶対にしないでください。
2.  **品質向上に直結する質問をする:** 質問の目的は、設計の曖昧さをなくし、一貫性を高め、完成度を上げることです。以下の観点に集中してください。
    -   **曖昧な記述の明確化:** 複数の解釈ができる表現や、具体性に欠ける箇所を指摘し、明確にするための質問をしてください。
    -   **情報の欠落や不備の指摘:** その種の設計書として本来あるべき情報（非機能要件、エラーハンドリング、制約条件など）が不足している場合、それを補うための質問をしてください。
    -   **矛盾点の解消:** ドキュメント内で矛盾している箇所を見つけ、どちらが正しいか、あるいはどう修正すべきかを問う質問をしてください。
    -   **「未確定事項」の深掘り:** 「未確定」とされている項目について、それを確定させるために必要な情報を引き出す質問をしてください。

あなたの質問は、ユーザーが設計の穴に気づき、より堅牢なドキュメントを作成するための、鋭い洞察に満ちたものでなければなりません。`;
const DEFAULT_QG_USER_PROMPT = "以下のMarkdownドキュメントを読み、「未確定事項」としてリストアップされている各項目を、ユーザーが回答しやすい明確な質問形式に変換してください。さらに、各質問に対して、ユーザーが選択できる簡潔な回答の候補（サジェスト）を1〜3個生成してください。もし「未確定事項」セクションがない、あるいは項目が空の場合は、ドキュメント全体から内容を明確化するためにユーザーに尋ねるべき質問と、それに対する回答のサジェストを生成してください。";
const DEFAULT_QG_TEMPERATURE = 0.7;

const DEFAULT_REFINE_PERSONA_PROMPT = `あなたは、極めて慎重かつ優秀なテクニカルエディターです。あなたの唯一の使命は、提供された「元のドキュメント」と「質疑応答」の内容を使い、元のドキュメントを正確に改良することです。創造的な作業は一切行わず、与えられた情報のみを忠実に統合してください。

**最重要原則（絶対に遵守してください）:**
1.  **原型を維持する:** 元のドキュメントの見出し構造、セクションの順序、段落の構成を最大限維持してください。質疑応答の内容を反映させるために必要な最小限の変更に留めてください。独自の判断でセクションを再編成したり、新しいセクションを追加したりしないでください。
2.  **変更箇所を限定する:** あなたが行う変更は、提供された「質疑応答」の内容に直接基づくもののみです。回答で示された情報を、元のドキュメントの適切な箇所に正確に反映させてください。回答にない情報を推測して追記したり、独自の解釈で内容を膨ませたりすることは固く禁じます。
3.  **情報を省略しない:** 元のドキュメントに含まれている情報を、あなたの判断で省略したり、要約したりしないでください。出力は、質疑応答の内容を反映した「完全な」ドキュメントでなければなりません。
4.  **「マージ」の意識を持つ:** あなたの仕事は、ゼロから文章を書き直すことではなく、既存のドキュメントに新しい情報を「統合（マージ）」することです。「未確定事項」が回答によって確定した場合、その箇所を新しい情報で置き換えてください。既存の記述を補足する回答であれば、その内容を自然な形で追記してください。

出力は、改良後の完全なMarkdownドキュメント全体のみとし、絶対に全体をコードブロック（\`\`\`）で囲まないでください。`;
const DEFAULT_REFINE_USER_PROMPT = "以前生成した以下のMarkdownドキュメントがあります。後続の「質疑応答」の内容を完全に反映させ、ドキュメントを改良してください。変更点だけでなく、改良後の完全なMarkdownドキュメント全体を出力してください。";
const DEFAULT_REFINE_TEMPERATURE = 0.4;


interface ExchangeRateInfo {
  rate: number;
  lastUpdated: number;
}

const sanitizeFilename = (name: string): string => {
    if (!name) return 'document.md';
    let sanitized = name.replace(/[/\\?%*:|"<>]/g, '-');
    sanitized = sanitized.replace(/\s+/g, '_');
    
    if (!sanitized.toLowerCase().endsWith('.md')) {
        const lastDotIndex = sanitized.lastIndexOf('.');
        if (lastDotIndex > -1) {
            sanitized = sanitized.substring(0, lastDotIndex);
        }
        sanitized += '.md';
    }
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


const ResultOutput: React.FC<{ result: AnalysisResult; index: number; onCopy: (markdown: string) => void; onDownload: (markdown: string) => void; exchangeRateInfo: ExchangeRateInfo | null; }> = ({ result, index, onCopy, onDownload, exchangeRateInfo }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    onCopy(result.markdown);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8">
      <div className="flex justify-between items-center border-b pb-2 mb-4 border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <DocumentIcon className="h-6 w-6" />
          {index === 0 ? '解析結果' : `改良版 #${index}`}
        </h2>
        {result.markdown && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              disabled={isCopied}
              className={`flex items-center gap-1.5 px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                isCopied ? 'bg-green-600 focus:ring-green-500 cursor-default' : 'bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 focus:ring-gray-500'
              }`}
              title={isCopied ? "コピーしました！" : "Markdownをコピー"}
            >
              {isCopied ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
              <span className="hidden sm:inline">{isCopied ? 'コピー完了' : 'コピー'}</span>
            </button>
            <button
              onClick={() => onDownload(result.markdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800 transition-all"
              title="Markdownをダウンロード"
            >
              <DownloadIcon className="h-4 w-4" />
              <span className="hidden sm:inline">ダウンロード</span>
            </button>
          </div>
        )}
      </div>
      
      <MarkdownPreview markdown={result.markdown} isLoading={false} progressMessage="" />

      {result.usageInfo && (
        <div className="mt-6">
          <UsageInfoDisplay usage={result.usageInfo} exchangeRateInfo={exchangeRateInfo} />
        </div>
      )}

      {result.debugInfo && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          <DebugInfo debugInfo={result.debugInfo} />
        </div>
      )}
    </div>
  );
};


export default function App() {
  const isGeminiAvailable = useMemo(() => !!(process.env.API_KEY || process.env.GEMINI_API_KEY), []);
  
  // Main Settings
  const [mode, setMode] = useLocalStorage<Mode>('doc-converter-mode', isGeminiAvailable ? Mode.GEMINI : Mode.OPENROUTER);
  const [analysisMode, setAnalysisMode] = useLocalStorage<AnalysisMode>('analysis-mode', 'image-with-text');
  const [openRouterApiKey, setOpenRouterApiKey] = useLocalStorage<string>('openrouter-api-key', '');
  const [isApiKeyInvalid, setIsApiKeyInvalid] = useState<boolean>(false);
  const [openRouterModel, setOpenRouterModel] = useLocalStorage<string>('openrouter-model', 'openai/gpt-4o');
  const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>([]);
  const [isFreeModelSelected, setIsFreeModelSelected] = useState<boolean>(false);
  const [isThinkingEnabled, setIsThinkingEnabled] = useLocalStorage<boolean>('thinking-enabled', true);

  // File and results state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [analysisHistory, setAnalysisHistory] = useLocalStorage<AnalysisResult[]>('doc-converter-analysis-history', []);
  const [questionsMap, setQuestionsMap] = useLocalStorage<Record<string, Question[]>>('doc-converter-questions-map', {});
  const [answeredQuestionsMap, setAnsweredQuestionsMap] = useLocalStorage<Record<string, Question[]>>('doc-converter-answered-questions-map', {});

  // Loading and error states
  const [isLoading, setIsLoading] = useState<boolean>(false); // For initial analysis
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [latestRefiningSourceId, setLatestRefiningSourceId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [progressMessage, setProgressMessage] = useState<string>('');
  
  // Misc state
  const [exchangeRateInfo, setExchangeRateInfo] = useState<ExchangeRateInfo | null>(null);

  // --- AI Settings State ---
  // 1. Initial Analysis
  const [personaPrompt, setPersonaPrompt] = useLocalStorage<string>('ai-persona-prompt', DEFAULT_PERSONA_PROMPT);
  const [userPrompt, setUserPrompt] = useLocalStorage<string>('ai-user-prompt', DEFAULT_USER_PROMPT);
  const [temperature, setTemperature] = useLocalStorage<number>('ai-temperature', DEFAULT_TEMPERATURE);
  const [presets, setPresets] = useLocalStorage<PromptPreset[]>('ai-presets', []);
  const [selectedPresetId, setSelectedPresetId] = useLocalStorage<string>('ai-selected-preset-id', 'default');
  
  // 2. Question Generation
  const [qgOpenRouterModel, setQgOpenRouterModel] = useLocalStorage<string>('qg-openrouter-model', 'google/gemini-2.5-flash-lite');
  const [qgPersonaPrompt, setQgPersonaPrompt] = useLocalStorage<string>('qg-persona-prompt', DEFAULT_QG_PERSONA_PROMPT);
  const [qgUserPrompt, setQgUserPrompt] = useLocalStorage<string>('qg-user-prompt', DEFAULT_QG_USER_PROMPT);
  const [qgTemperature, setQgTemperature] = useLocalStorage<number>('qg-temperature', DEFAULT_QG_TEMPERATURE);
  const [qgPresets, setQgPresets] = useLocalStorage<PromptPreset[]>('qg-presets', []);
  const [selectedQgPresetId, setSelectedQgPresetId] = useLocalStorage<string>('qg-selected-preset-id', 'default');

  // 3. Refinement
  const [refineOpenRouterModel, setRefineOpenRouterModel] = useLocalStorage<string>('refine-openrouter-model', 'google/gemini-2.5-flash');
  const [refinePersonaPrompt, setRefinePersonaPrompt] = useLocalStorage<string>('refine-persona-prompt', DEFAULT_REFINE_PERSONA_PROMPT);
  const [refineUserPrompt, setRefineUserPrompt] = useLocalStorage<string>('refine-user-prompt', DEFAULT_REFINE_USER_PROMPT);
  const [refineTemperature, setRefineTemperature] = useLocalStorage<number>('refine-temperature', DEFAULT_REFINE_TEMPERATURE);
  const [refinePresets, setRefinePresets] = useLocalStorage<PromptPreset[]>('refine-presets', []);
  const [selectedRefinePresetId, setSelectedRefinePresetId] = useLocalStorage<string>('refine-selected-preset-id', 'default');

  // MSAL State
  const [msalInstance] = useState(() => new PublicClientApplication(msalConfig));
  const [account, setAccount] = useState<any | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeMsal = async () => {
      try {
        await msalInstance.initialize();
        const currentAccounts = msalInstance.getAllAccounts();
        if (currentAccounts.length > 0) {
          setAccount(currentAccounts[0]);
        }
      } catch (err: any) {
        console.error(err);
        setAuthError(err.errorMessage || 'An unknown authentication error occurred.');
      } finally {
        setIsAuthLoading(false);
      }
    };
    initializeMsal();
  }, [msalInstance]);

  const handleLogin = useCallback(async () => {
    try {
      const response = await msalInstance.loginPopup(loginRequest);
      setAccount(response.account);
    } catch (e: any) {
      console.error(e);
      setAuthError(e.errorMessage || 'Login failed.');
    }
  }, [msalInstance]);

  const handleLogout = useCallback(async () => {
    if (account) {
      try {
        await msalInstance.logoutPopup({ account });
        setAccount(null);
      } catch (e: any) {
        console.error(e);
        setAuthError(e.errorMessage || 'Logout failed.');
      }
    }
  }, [msalInstance, account]);
  
  const isAuthorized = useMemo(() => {
    if (!account) return false;
    const username = account.username || '';
    return username.toLowerCase().endsWith(`@${AUTHORIZED_DOMAIN}`);
  }, [account]);

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
        if (!response.ok) return;
        const data = await response.json();
        if (data && data.rates && data.rates.JPY && data.time_last_update_unix) {
          setExchangeRateInfo({ rate: data.rates.JPY, lastUpdated: data.time_last_update_unix * 1000 });
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
    setProgressMessage('OpenRouterのモデルを取得中...');
    fetchModels(openRouterApiKey)
      .then(models => { if (!isCancelled) setAvailableModels(models); })
      .catch(err => {
        if (!isCancelled) {
          setError('OpenRouterモデルの取得に失敗しました。APIキーを確認してください。');
          setAvailableModels([]);
        }
      })
      .finally(() => { if (!isCancelled) setProgressMessage(''); });
    return () => { isCancelled = true; };
  }, [mode, openRouterApiKey]);

  useEffect(() => {
    if (availableModels.length > 0) {
      if (!availableModels.some(m => m.id === openRouterModel)) setOpenRouterModel(availableModels[0].id);
      if (!availableModels.some(m => m.id === qgOpenRouterModel)) setQgOpenRouterModel(availableModels[0].id);
      if (!availableModels.some(m => m.id === refineOpenRouterModel)) setRefineOpenRouterModel(availableModels[0].id);
    }
  }, [availableModels, openRouterModel, qgOpenRouterModel, refineOpenRouterModel, setOpenRouterModel, setQgOpenRouterModel, setRefineOpenRouterModel]);

  useEffect(() => {
    if (mode === Mode.OPENROUTER && openRouterModel && availableModels.length > 0) {
      const selectedModel = availableModels.find(m => m.id === openRouterModel);
      setIsFreeModelSelected(selectedModel?.name.toLowerCase().includes('free') ?? false);
    } else {
      setIsFreeModelSelected(false);
    }
  }, [mode, openRouterModel, availableModels]);

  const handleAnalysis = useCallback(async () => {
    if (!pdfFile) { setError('最初にPDFファイルをアップロードしてください。'); return; }
    if (mode === Mode.GEMINI) {
      if (!isGeminiAvailable) { setError('Gemini APIキーが設定されていないため、Geminiは利用できません。'); return; }
      if (!isAuthorized) { setError('Geminiを利用するには、指定されたドメインのアカウントでログインする必要があります。'); return; }
    }
    if (mode === Mode.OPENROUTER && (!openRouterApiKey || !openRouterModel)) { setError('OpenRouterのAPIキーを入力し、モデルを選択してください。'); return; }

    setIsApiKeyInvalid(false);
    setIsLoading(true);
    setError('');
    setAnalysisHistory([]);
    setQuestionsMap({});
    setAnsweredQuestionsMap({});

    try {
      setProgressMessage('PDFファイルを読み込んでいます...');
      const fileBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
      const pageImages: string[] = [];
      let allTextContent: string | undefined = undefined;

      if (analysisMode === 'image-with-text') {
        let textContentBuilder = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          textContentBuilder += `--- Page ${i} ---\n${textContent.items.map((item: any) => item.str).join(' ')}\n\n`;
        }
        allTextContent = textContentBuilder;
      }
      
      for (let i = 1; i <= pdf.numPages; i++) {
        setProgressMessage(`${i}/${pdf.numPages}ページを処理中...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const context = canvas.getContext('2d');
        if (context) {
          await page.render({ canvasContext: context, viewport: viewport }).promise;
          pageImages.push(canvas.toDataURL('image/jpeg'));
        }
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
      
      if (typeof analysisResponse.result === 'string') {
        const newResult: AnalysisResult = {
          id: self.crypto.randomUUID(),
          markdown: analysisResponse.result,
          debugInfo: analysisResponse.debug,
          usageInfo: analysisResponse.usage,
        };
        setAnalysisHistory([newResult]);
      } else {
        throw new Error("AIからの応答が予期した形式ではありません。");
      }

    } catch (err: any) {
      console.error(err);
      setError(`エラーが発生しました: ${err.message || '不明なエラー'}`);
      if (mode === Mode.OPENROUTER && (String(err.message).includes('401') || String(err.message).toLowerCase().includes('auth'))) {
        setIsApiKeyInvalid(true);
      }
    } finally {
      setIsLoading(false);
      setProgressMessage('');
    }
  }, [pdfFile, mode, analysisMode, openRouterApiKey, openRouterModel, personaPrompt, userPrompt, temperature, selectedOpenRouterModel, isThinkingEnabled, isGeminiAvailable, isAuthorized, setAnalysisHistory, setQuestionsMap, setAnsweredQuestionsMap]);

  const handleGenerateQuestions = useCallback(async (sourceResultId: string) => {
    const sourceResult = analysisHistory.find(r => r.id === sourceResultId);
    if (!sourceResult) return;

    setIsGeneratingQuestions(true);
    setError('');
    
    try {
      let result: { questions: Question[]; debug: any; usage: UsageInfo | null; };
      if (mode === Mode.GEMINI) {
        result = await generateClarificationQuestions(sourceResult.markdown, qgPersonaPrompt, qgUserPrompt, qgTemperature);
      } else {
        result = await generateClarificationQuestionsWithOpenRouter(sourceResult.markdown, qgOpenRouterModel, openRouterApiKey, qgPersonaPrompt, qgUserPrompt, qgTemperature);
      }
      setQuestionsMap(prev => ({ ...prev, [sourceResultId]: result.questions }));
    } catch (err: any) {
      setError(`質問の生成中にエラーが発生しました: ${err.message}`);
    } finally {
      setIsGeneratingQuestions(false);
    }
  }, [analysisHistory, mode, openRouterApiKey, qgOpenRouterModel, qgPersonaPrompt, qgUserPrompt, qgTemperature, setQuestionsMap]);

  const handleRefineDocument = useCallback(async (sourceResultId: string, answeredQuestions: Question[]) => {
    if (!sourceResultId || !pdfFile) return;
    
    const sourceDocIndex = analysisHistory.findIndex(r => r.id === sourceResultId);
    if (sourceDocIndex === -1) {
        setError('改良の元となるドキュメントが見つかりませんでした。');
        return;
    }
    const sourceDocument = analysisHistory[sourceDocIndex];

    // --- History Truncation Logic ---
    let newHistory = [...analysisHistory];
    let newQuestionsMap = {...questionsMap};
    let newAnsweredMap = {...answeredQuestionsMap};
    
    const nextResultIndex = sourceDocIndex + 1;
    if (newHistory.length > nextResultIndex) {
        const idsToRemove = newHistory.slice(nextResultIndex).map(r => r.id);
        newHistory = newHistory.slice(0, nextResultIndex);
        idsToRemove.forEach(id => {
            delete newQuestionsMap[id];
            delete newAnsweredMap[id];
        });
    }
    newAnsweredMap[sourceResultId] = answeredQuestions;

    setAnalysisHistory(newHistory);
    setQuestionsMap(newQuestionsMap);
    setAnsweredQuestionsMap(newAnsweredMap);
    // --- End History Truncation ---

    const qaString = answeredQuestions.map(q => `Q: ${q.question}\nA: ${q.answer || '(回答なし)'}`).join('\n\n');
    const fullRefineUserPrompt = `${refineUserPrompt}\n\n# 元のドキュメント\n\`\`\`markdown\n${sourceDocument.markdown}\n\`\`\`\n\n# 質疑応答\n${qaString}`;

    setIsRefining(true);
    setLatestRefiningSourceId(sourceResultId);
    setError('');

    try {
       setProgressMessage('PDFを再読み込み中...');
      const fileBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
      const pageImages: string[] = [];
      let allTextContent: string | undefined = undefined;

      if (analysisMode === 'image-with-text') {
        let textContentBuilder = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          textContentBuilder += `--- Page ${i} ---\n${textContent.items.map((item: any) => item.str).join(' ')}\n\n`;
        }
        allTextContent = textContentBuilder;
      }
      for (let i = 1; i <= pdf.numPages; i++) {
        setProgressMessage(`${i}/${pdf.numPages}ページを処理中...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const context = canvas.getContext('2d');
        if (context) {
          await page.render({ canvasContext: context, viewport: viewport }).promise;
          pageImages.push(canvas.toDataURL('image/jpeg'));
        }
      }
      
      let analysisResponse: { result: string; debug: any; usage: UsageInfo | null };
      if (mode === Mode.GEMINI) {
        setProgressMessage('Geminiで改良中...');
        analysisResponse = await analyzeDocumentWithGemini(fullRefineUserPrompt, pageImages, refinePersonaPrompt, refineTemperature, allTextContent);
      } else {
        setProgressMessage(`OpenRouter (${refineOpenRouterModel})で改良中...`);
        const isThinkingOn = !!(availableModels.find(m => m.id === refineOpenRouterModel)?.supports_thinking && isThinkingEnabled);
        analysisResponse = await analyzeDocumentWithOpenRouter(fullRefineUserPrompt, pageImages, refineOpenRouterModel, openRouterApiKey, refinePersonaPrompt, refineTemperature, allTextContent, isThinkingOn);
      }

      if (typeof analysisResponse.result === 'string') {
        const newResult: AnalysisResult = {
          id: self.crypto.randomUUID(),
          markdown: analysisResponse.result,
          debugInfo: analysisResponse.debug,
          usageInfo: analysisResponse.usage,
        };
        setAnalysisHistory(prev => [...prev, newResult]);
      } else {
        throw new Error("AIからの応答が予期した形式ではありません。");
      }
    } catch (err: any) {
      setError(`ドキュメントの改良中にエラーが発生しました: ${err.message}`);
    } finally {
      setIsRefining(false);
      setLatestRefiningSourceId(null);
      setProgressMessage('');
    }

  }, [analysisHistory, pdfFile, analysisMode, mode, openRouterApiKey, refineOpenRouterModel, refinePersonaPrompt, refineUserPrompt, refineTemperature, availableModels, isThinkingEnabled, questionsMap, answeredQuestionsMap, setAnalysisHistory, setQuestionsMap, setAnsweredQuestionsMap]);
  
  const handleDownload = useCallback((markdown: string) => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = extractFilenameFromMarkdown(markdown);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleCopy = useCallback((markdown: string) => {
    if (!markdown) return;
    navigator.clipboard.writeText(markdown).catch(err => {
      console.error('Failed to copy markdown: ', err);
      alert('クリップボードへのコピーに失敗しました。');
    });
  }, []);
  
  const createPresetHandlers = (
      presets: PromptPreset[], setPresets: (p: PromptPreset[]) => void,
      setSelectedId: (id: string) => void,
      setPersona: (p: string) => void, setUser: (p: string) => void, setTemp: (t: number) => void,
      defaults: { persona: string, user: string, temp: number },
      currentPersonaPrompt: string,
      currentUserPrompt: string,
      currentTemperature: number
  ) => ({
      onSavePreset: (name: string) => {
          if (!name.trim()) return;
          const newPreset: PromptPreset = {
              id: self.crypto.randomUUID(), name: name.trim(), personaPrompt: currentPersonaPrompt, userPrompt: currentUserPrompt, temperature: currentTemperature
          };
          const updated = presets.filter(p => p.name !== name.trim());
          setPresets([...updated, newPreset]);
          setSelectedId(newPreset.id);
      },
      onLoadPreset: (id: string) => {
          setSelectedId(id);
          const preset = presets.find(p => p.id === id);
          if (id === 'default' || !preset) {
              setPersona(defaults.persona); setUser(defaults.user); setTemp(defaults.temp);
          } else {
              setPersona(preset.personaPrompt); setUser(preset.userPrompt); setTemp(preset.temperature);
          }
      },
      onDeletePreset: (id: string) => {
          if (!confirm('このプリセットを削除してもよろしいですか？')) return;
          setPresets(presets.filter(p => p.id !== id));
          setSelectedId('default');
          setPersona(defaults.persona); setUser(defaults.user); setTemp(defaults.temp);
      }
  });

  const mainPresetHandlers = createPresetHandlers(presets, setPresets, setSelectedPresetId, setPersonaPrompt, setUserPrompt, setTemperature, { persona: DEFAULT_PERSONA_PROMPT, user: DEFAULT_USER_PROMPT, temp: DEFAULT_TEMPERATURE }, personaPrompt, userPrompt, temperature);
  const qgPresetHandlers = createPresetHandlers(qgPresets, setQgPresets, setSelectedQgPresetId, setQgPersonaPrompt, setQgUserPrompt, setQgTemperature, { persona: DEFAULT_QG_PERSONA_PROMPT, user: DEFAULT_QG_USER_PROMPT, temp: DEFAULT_QG_TEMPERATURE }, qgPersonaPrompt, qgUserPrompt, qgTemperature);
  const refinePresetHandlers = createPresetHandlers(refinePresets, setRefinePresets, setSelectedRefinePresetId, setRefinePersonaPrompt, setRefineUserPrompt, setRefineTemperature, { persona: DEFAULT_REFINE_PERSONA_PROMPT, user: DEFAULT_REFINE_USER_PROMPT, temp: DEFAULT_REFINE_TEMPERATURE }, refinePersonaPrompt, refineUserPrompt, refineTemperature);

  
  const isAnalyzeDisabled = isLoading || !pdfFile || (mode === Mode.OPENROUTER && (!openRouterApiKey || !openRouterModel)) || (mode === Mode.GEMINI && (!isAuthorized || !isGeminiAvailable));
  const isAnyLoading = isLoading || isGeneratingQuestions || isRefining;

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
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8">
              <div className="space-y-6">
                <h2 className="text-xl font-bold border-b pb-2 border-gray-200 dark:border-gray-700">設定</h2>
                <ModeSwitcher mode={mode} setMode={setMode} isGeminiAvailable={isGeminiAvailable} />
                <AnalysisModeSwitcher mode={analysisMode} setMode={setAnalysisMode} />
                
                {mode === Mode.GEMINI && isGeminiAvailable && (
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
                
                {mode === Mode.OPENROUTER && (
                  <div className="space-y-4 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                    <ApiKeyInput apiKey={openRouterApiKey} setApiKey={(key: string) => { setOpenRouterApiKey(key); setIsApiKeyInvalid(false); }} isInvalid={isApiKeyInvalid} />
                    <ModelSelector model={openRouterModel} setModel={setOpenRouterModel} models={availableModels} disabled={!openRouterApiKey || availableModels.length === 0} />
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
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 space-y-8">
              <div className="space-y-6">
                <h2 className="text-xl font-bold border-b pb-2 border-gray-200 dark:border-gray-700">アップロード</h2>
                <FileUpload onFileSelect={(file) => { setPdfFile(file); setAnalysisHistory([]); setQuestionsMap({}); setAnsweredQuestionsMap({}); setError(''); }} />
              </div>
              <button onClick={handleAnalysis} disabled={isAnalyzeDisabled} className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all transform hover:scale-105 disabled:scale-100">
                {isLoading ? ( <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>{progressMessage || '解析中...'}</span></> ) : ( <><WandSparklesIcon className="h-5 w-5" /><span>ドキュメントを解析</span></> )}
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                <CollapsibleSection title="AI設定">
                  <PromptSettings
                    main={{ personaPrompt, setPersonaPrompt, userPrompt, setUserPrompt, temperature, setTemperature, presets, selectedPresetId, ...mainPresetHandlers, openRouterModel }}
                    qg={{ personaPrompt: qgPersonaPrompt, setPersonaPrompt: setQgPersonaPrompt, userPrompt: qgUserPrompt, setUserPrompt: setQgUserPrompt, temperature: qgTemperature, setTemperature: setQgTemperature, presets: qgPresets, selectedPresetId: selectedQgPresetId, ...qgPresetHandlers, openRouterModel: qgOpenRouterModel, setOpenRouterModel: setQgOpenRouterModel }}
                    refine={{ personaPrompt: refinePersonaPrompt, setPersonaPrompt: setRefinePersonaPrompt, userPrompt: refineUserPrompt, setUserPrompt: setRefineUserPrompt, temperature: refineTemperature, setTemperature: setRefineTemperature, presets: refinePresets, selectedPresetId: selectedRefinePresetId, ...refinePresetHandlers, openRouterModel: refineOpenRouterModel, setOpenRouterModel: setRefineOpenRouterModel }}
                    mode={mode}
                    isGeminiAvailable={isGeminiAvailable}
                    availableModels={availableModels}
                    openRouterApiKey={openRouterApiKey}
                  />
                </CollapsibleSection>
            </div>
          </div>

          {/* --- Right Column: Output --- */}
          <div className="space-y-8 xl:col-span-3">
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
                <p className="font-bold">エラー</p><p>{error}</p>
              </div>
            )}
            
            {(isAnyLoading && analysisHistory.length === 0) ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8">
                 <MarkdownPreview markdown="" isLoading={true} progressMessage={progressMessage} />
              </div>
            ) : analysisHistory.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8">
                 <MarkdownPreview markdown="" isLoading={false} progressMessage="" />
              </div>
            ) : null}

            <div className="space-y-8">
              {analysisHistory.map((result, index) => {
                const isLatestResult = index === analysisHistory.length - 1;
                const questionsForThisResult = questionsMap[result.id];
                const answeredQuestionsForThisResult = answeredQuestionsMap[result.id];
                const isCurrentlyRefiningFromThis = isRefining && latestRefiningSourceId === result.id;
                const isCurrentlyGeneratingQuestions = isGeneratingQuestions && isLatestResult && !questionsForThisResult;

                return (
                  <div key={result.id}>
                    <ResultOutput result={result} index={index} onCopy={handleCopy} onDownload={handleDownload} exchangeRateInfo={exchangeRateInfo} />
                    
                    {isCurrentlyGeneratingQuestions && (
                      <div className="flex items-center justify-center p-4 text-gray-600 dark:text-gray-400"><svg className="animate-spin mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>確認事項を生成中...</span></div>
                    )}

                    {questionsForThisResult && (
                      <ClarificationPanel
                        key={`questions-${result.id}`}
                        questions={questionsForThisResult}
                        answeredQuestions={answeredQuestionsForThisResult}
                        onAnswersSubmit={(answeredQuestions) => handleRefineDocument(result.id, answeredQuestions)}
                        isRefining={isCurrentlyRefiningFromThis}
                      />
                    )}

                    {isLatestResult && !isAnyLoading && !questionsForThisResult && (
                      <div className="mt-8 flex justify-center">
                        <button
                          onClick={() => handleGenerateQuestions(result.id)}
                          className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-dashed border-primary-400 text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                          <SparklesIcon className="h-5 w-5" />
                          <span>さらに改良する (AIに質問させる)</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <footer className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>React, Tailwind CSS, Gemini, OpenRouter を利用しています。</p>
        </footer>
      </main>
    </div>
  );
}
