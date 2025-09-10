
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Mode, OpenRouterModel, PromptPreset, AnalysisMode, UsageInfo, Question, AnalysisResult, ExchangeRateInfo } from '../types';
import useLocalStorage from './useLocalStorage';
import { analyzeDocumentWithGemini, generateClarificationQuestions, generateDiffWithGemini } from '../services/geminiService';
import { analyzeDocumentWithOpenRouter, fetchModels, generateClarificationQuestionsWithOpenRouter, generateDiffWithOpenRouter } from '../services/openRouterService';
import {
    DEFAULT_PERSONA_PROMPT, DEFAULT_USER_PROMPT, DEFAULT_TEMPERATURE,
    DEFAULT_QG_PERSONA_PROMPT, DEFAULT_QG_USER_PROMPT, DEFAULT_QG_TEMPERATURE,
    DEFAULT_REFINE_PERSONA_PROMPT, DEFAULT_REFINE_USER_PROMPT, DEFAULT_REFINE_TEMPERATURE,
    DEFAULT_DIFF_PERSONA_PROMPT, DEFAULT_DIFF_USER_PROMPT, DEFAULT_DIFF_TEMPERATURE
} from '../constants';

// pdf.js is loaded from CDN, so we need to declare its global object
declare const pdfjsLib: any;

export const useAppStateManager = ({ isGeminiAvailable, isAuthorized }: { isGeminiAvailable: boolean; isAuthorized: boolean; }) => {
    // Main Settings
    const [mode, setMode] = useLocalStorage<Mode>('doc-converter-mode', isGeminiAvailable ? Mode.GEMINI : Mode.OPENROUTER);
    const [analysisMode, setAnalysisMode] = useLocalStorage<AnalysisMode>('analysis-mode', 'image-with-text');
    const [openRouterApiKey, setOpenRouterApiKey] = useLocalStorage<string>('openrouter-api-key', '');
    const [isApiKeyInvalid, setIsApiKeyInvalid] = useState<boolean>(false);
    const [openRouterModel, setOpenRouterModel] = useLocalStorage<string>('openrouter-model', 'openai/gpt-4o');
    const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>([]);
    const [isFreeModelSelected, setIsFreeModelSelected] = useState<boolean>(false);
    const [isThinkingEnabled, setIsThinkingEnabled] = useLocalStorage<boolean>('thinking-enabled', true);
    const [userManuallySetRefineModel, setUserManuallySetRefineModel] = useLocalStorage<boolean>('user-manually-set-refine-model', false);

    // File and results state
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState<boolean>(false);
    const [analysisHistory, setAnalysisHistory] = useLocalStorage<AnalysisResult[]>('doc-converter-analysis-history', []);
    const [questionsMap, setQuestionsMap] = useLocalStorage<Record<string, Question[]>>('doc-converter-questions-map', {});
    const [answeredQuestionsMap, setAnsweredQuestionsMap] = useLocalStorage<Record<string, Question[]>>('doc-converter-answered-questions-map', {});
    const [customInstructionsMap, setCustomInstructionsMap] = useLocalStorage<Record<string, string>>('doc-converter-custom-instructions-map', {});
    const [diffMap, setDiffMap] = useLocalStorage<Record<string, string>>('doc-converter-diff-map', {});

    // Loading and error states
    const [isLoading, setIsLoading] = useState<boolean>(false); // For initial analysis
    const [isGeneratingQuestions, setIsGeneratingQuestions] = useState<boolean>(false);
    const [isRefining, setIsRefining] = useState<boolean>(false);
    const [isGeneratingDiff, setIsGeneratingDiff] = useState<boolean>(false);
    const [latestRefiningSourceId, setLatestRefiningSourceId] = useState<string | null>(null);
    const [latestDiffingSourceId, setLatestDiffingSourceId] = useState<string | null>(null);
    const [error, setError] = useState<string>('');
    const [progressMessage, setProgressMessage] = useState<string>('');
    
    // Misc state
    const [exchangeRateInfo, setExchangeRateInfo] = useState<ExchangeRateInfo | null>(null);

    // --- AI Settings State ---
    const [personaPrompt, setPersonaPrompt] = useLocalStorage<string>('ai-persona-prompt', DEFAULT_PERSONA_PROMPT);
    const [userPrompt, setUserPrompt] = useLocalStorage<string>('ai-user-prompt', DEFAULT_USER_PROMPT);
    const [temperature, setTemperature] = useLocalStorage<number>('ai-temperature', DEFAULT_TEMPERATURE);
    const [presets, setPresets] = useLocalStorage<PromptPreset[]>('ai-presets', []);
    const [selectedPresetId, setSelectedPresetId] = useLocalStorage<string>('ai-selected-preset-id', 'default');
    
    const [qgOpenRouterModel, setQgOpenRouterModel] = useLocalStorage<string>('qg-openrouter-model', 'google/gemini-2.5-flash');
    const [qgPersonaPrompt, setQgPersonaPrompt] = useLocalStorage<string>('qg-persona-prompt', DEFAULT_QG_PERSONA_PROMPT);
    const [qgUserPrompt, setQgUserPrompt] = useLocalStorage<string>('qg-user-prompt', DEFAULT_QG_USER_PROMPT);
    const [qgTemperature, setQgTemperature] = useLocalStorage<number>('qg-temperature', DEFAULT_QG_TEMPERATURE);
    const [qgPresets, setQgPresets] = useLocalStorage<PromptPreset[]>('qg-presets', []);
    const [selectedQgPresetId, setSelectedQgPresetId] = useLocalStorage<string>('qg-selected-preset-id', 'default');

    const [refineOpenRouterModel, setRefineOpenRouterModel] = useLocalStorage<string>('refine-openrouter-model', 'google/gemini-2.5-flash');
    const [refinePersonaPrompt, setRefinePersonaPrompt] = useLocalStorage<string>('refine-persona-prompt', DEFAULT_REFINE_PERSONA_PROMPT);
    const [refineUserPrompt, setRefineUserPrompt] = useLocalStorage<string>('refine-user-prompt', DEFAULT_REFINE_USER_PROMPT);
    const [refineTemperature, setRefineTemperature] = useLocalStorage<number>('refine-temperature', DEFAULT_REFINE_TEMPERATURE);
    const [refinePresets, setRefinePresets] = useLocalStorage<PromptPreset[]>('refine-presets', []);
    const [selectedRefinePresetId, setSelectedRefinePresetId] = useLocalStorage<string>('refine-selected-preset-id', 'default');
    
    const [diffOpenRouterModel, setDiffOpenRouterModel] = useLocalStorage<string>('diff-openrouter-model', 'google/gemini-2.5-flash');
    const [diffPersonaPrompt, setDiffPersonaPrompt] = useLocalStorage<string>('diff-persona-prompt', DEFAULT_DIFF_PERSONA_PROMPT);
    const [diffUserPrompt, setDiffUserPrompt] = useLocalStorage<string>('diff-user-prompt', DEFAULT_DIFF_USER_PROMPT);
    const [diffTemperature, setDiffTemperature] = useLocalStorage<number>('diff-temperature', DEFAULT_DIFF_TEMPERATURE);
    const [diffPresets, setDiffPresets] = useLocalStorage<PromptPreset[]>('diff-presets', []);
    const [selectedDiffPresetId, setSelectedDiffPresetId] = useLocalStorage<string>('diff-selected-preset-id', 'default');

    const selectedOpenRouterModel = useMemo(() => {
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
            if (!availableModels.some(m => m.id === refineOpenRouterModel)) {
                if (!userManuallySetRefineModel) {
                    setRefineOpenRouterModel(openRouterModel);
                } else {
                    setRefineOpenRouterModel(availableModels[0].id);
                }
            }
            if (!availableModels.some(m => m.id === diffOpenRouterModel)) setDiffOpenRouterModel(availableModels[0].id);
        }
    }, [availableModels, openRouterModel, qgOpenRouterModel, refineOpenRouterModel, diffOpenRouterModel, setOpenRouterModel, setQgOpenRouterModel, setRefineOpenRouterModel, setDiffOpenRouterModel, userManuallySetRefineModel]);

    useEffect(() => {
        if (!userManuallySetRefineModel) {
            setRefineOpenRouterModel(openRouterModel);
        }
    }, [openRouterModel, userManuallySetRefineModel, setRefineOpenRouterModel]);

    const handleRefineModelChange = (modelId: string) => {
        setUserManuallySetRefineModel(true);
        setRefineOpenRouterModel(modelId);
    };

    useEffect(() => {
        if (mode === Mode.OPENROUTER && openRouterModel && availableModels.length > 0) {
            const selectedModel = availableModels.find(m => m.id === openRouterModel);
            setIsFreeModelSelected(selectedModel?.name.toLowerCase().includes('free') ?? false);
        } else {
            setIsFreeModelSelected(false);
        }
    }, [mode, openRouterModel, availableModels]);
    
    const handleFileSelect = (file: File | null) => {
        setPdfFile(file);
        setAnalysisHistory([]);
        setQuestionsMap({});
        setAnsweredQuestionsMap({});
        setCustomInstructionsMap({});
        setDiffMap({});
        setError('');
        if (file) {
          setIsPdfPreviewOpen(true);
        } else {
          setIsPdfPreviewOpen(false);
        }
      };

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
        setCustomInstructionsMap({});
        setDiffMap({});
    
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
      }, [pdfFile, mode, analysisMode, openRouterApiKey, openRouterModel, personaPrompt, userPrompt, temperature, selectedOpenRouterModel, isThinkingEnabled, isGeminiAvailable, isAuthorized, setAnalysisHistory, setQuestionsMap, setAnsweredQuestionsMap, setCustomInstructionsMap, setDiffMap]);
    
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
            const selectedQgModel = availableModels.find(m => m.id === qgOpenRouterModel);
            const isThinkingOn = !!(selectedQgModel?.supports_thinking && isThinkingEnabled);
            result = await generateClarificationQuestionsWithOpenRouter(sourceResult.markdown, qgOpenRouterModel, openRouterApiKey, qgPersonaPrompt, qgUserPrompt, qgTemperature, isThinkingOn);
          }
          setQuestionsMap(prev => ({ ...prev, [sourceResultId]: result.questions }));
        } catch (err: any) {
          setError(`質問の生成中にエラーが発生しました: ${err.message}`);
        } finally {
          setIsGeneratingQuestions(false);
        }
      }, [analysisHistory, mode, openRouterApiKey, qgOpenRouterModel, qgPersonaPrompt, qgUserPrompt, qgTemperature, setQuestionsMap, availableModels, isThinkingEnabled]);
    
      const handleRefineDocument = useCallback(async (sourceResultId: string, answeredQuestions: Question[], customInstructions: string) => {
        if (!sourceResultId || !pdfFile) return;
        
        const sourceDocIndex = analysisHistory.findIndex(r => r.id === sourceResultId);
        if (sourceDocIndex === -1) {
            setError('改良の元となるドキュメントが見つかりませんでした。');
            return;
        }
        const sourceDocument = analysisHistory[sourceDocIndex];
    
        let newHistory = [...analysisHistory];
        let newQuestionsMap = {...questionsMap};
        let newAnsweredMap = {...answeredQuestionsMap};
        let newCustomInstructionsMap = {...customInstructionsMap};
        let newDiffMap = {...diffMap};
        
        const nextResultIndex = sourceDocIndex + 1;
        if (newHistory.length > nextResultIndex) {
            const idsToRemove = newHistory.slice(nextResultIndex).map(r => r.id);
            newHistory = newHistory.slice(0, nextResultIndex);
            idsToRemove.forEach(id => {
                delete newQuestionsMap[id];
                delete newAnsweredMap[id];
                delete newCustomInstructionsMap[id];
                delete newDiffMap[id];
            });
        }
        newAnsweredMap[sourceResultId] = answeredQuestions;
        newCustomInstructionsMap[sourceResultId] = customInstructions;
    
        setAnalysisHistory(newHistory);
        setQuestionsMap(newQuestionsMap);
        setAnsweredQuestionsMap(newAnsweredMap);
        setCustomInstructionsMap(newCustomInstructionsMap);
        setDiffMap(newDiffMap);
    
        const qaString = answeredQuestions.map(q => `Q: ${q.question}\nA: ${q.answer || '(回答なし)'}`).join('\n\n');
        const customInstructionsString = customInstructions.trim() ? `\n\n# 追加の修正指示\n${customInstructions}` : '';
        const fullRefineUserPrompt = `${refineUserPrompt}\n\n# 元のドキュメント\n\`\`\`markdown\n${sourceDocument.markdown}\n\`\`\`\n\n# 質疑応答\n${qaString}${customInstructionsString}`;
    
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
    
      }, [analysisHistory, pdfFile, analysisMode, mode, openRouterApiKey, refineOpenRouterModel, refinePersonaPrompt, refineUserPrompt, refineTemperature, availableModels, isThinkingEnabled, questionsMap, answeredQuestionsMap, customInstructionsMap, diffMap, setAnalysisHistory, setQuestionsMap, setAnsweredQuestionsMap, setCustomInstructionsMap, setDiffMap]);
      
      const handleGenerateDiff = useCallback(async (newResultId: string, oldResultId: string) => {
        const newResult = analysisHistory.find(r => r.id === newResultId);
        const oldResult = analysisHistory.find(r => r.id === oldResultId);
    
        if (!newResult || !oldResult) {
          setError('差分生成の対象となるドキュメントが見つかりませんでした。');
          return;
        }
    
        setIsGeneratingDiff(true);
        setLatestDiffingSourceId(newResultId);
        setError('');
    
        try {
          let result: { result: string; debug: any; usage: UsageInfo | null; };
          if (mode === Mode.GEMINI) {
            result = await generateDiffWithGemini(oldResult.markdown, newResult.markdown, diffPersonaPrompt, diffUserPrompt, diffTemperature);
          } else {
            const selectedDiffModel = availableModels.find(m => m.id === diffOpenRouterModel);
            const isThinkingOn = !!(selectedDiffModel?.supports_thinking && isThinkingEnabled);
            result = await generateDiffWithOpenRouter(oldResult.markdown, newResult.markdown, diffOpenRouterModel, openRouterApiKey, diffPersonaPrompt, diffUserPrompt, diffTemperature, isThinkingOn);
          }
          setDiffMap(prev => ({ ...prev, [newResultId]: result.result }));
        } catch (err: any) {
          setError(`差分生成中にエラーが発生しました: ${err.message}`);
        } finally {
          setIsGeneratingDiff(false);
          setLatestDiffingSourceId(null);
        }
      }, [analysisHistory, mode, openRouterApiKey, diffOpenRouterModel, diffPersonaPrompt, diffUserPrompt, diffTemperature, availableModels, isThinkingEnabled, setDiffMap]);
    
    
      const handleDownload = useCallback((markdown: string, filename: string) => {
        if (!markdown) return;
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
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
          presets: PromptPreset[], setPresets: (p: PromptPreset[] | ((val: PromptPreset[]) => PromptPreset[])) => void,
          setSelectedId: (id: string | ((val: string) => string)) => void,
          setPersona: (p: string | ((val: string) => string)) => void, setUser: (p: string | ((val: string) => string)) => void, setTemp: (t: number | ((val: number) => number)) => void,
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
              setPresets(prev => {
                const updated = prev.filter(p => p.name !== name.trim());
                return [...updated, newPreset];
              });
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
      const diffPresetHandlers = createPresetHandlers(diffPresets, setDiffPresets, setSelectedDiffPresetId, setDiffPersonaPrompt, setDiffUserPrompt, setDiffTemperature, { persona: DEFAULT_DIFF_PERSONA_PROMPT, user: DEFAULT_DIFF_USER_PROMPT, temp: DEFAULT_DIFF_TEMPERATURE }, diffPersonaPrompt, diffUserPrompt, diffTemperature);
    
      const isAnalyzeDisabled = isLoading || !pdfFile || (mode === Mode.OPENROUTER && (!openRouterApiKey || !openRouterModel)) || (mode === Mode.GEMINI && (!isAuthorized || !isGeminiAvailable));
      const isAnyLoading = isLoading || isGeneratingQuestions || isRefining || isGeneratingDiff;
    
      const showImageCapabilityWarning = 
        mode === Mode.OPENROUTER &&
        (analysisMode === 'image-only' || analysisMode === 'image-with-text') &&
        selectedOpenRouterModel &&
        !selectedOpenRouterModel.modality_types.includes('image_input');

      const handleExportSettings = useCallback(() => {
        const getSelectedPresetName = (selectedId: string, presetsList: PromptPreset[]) => {
            if (selectedId === 'default') {
                return undefined;
            }
            return presetsList.find(p => p.id === selectedId)?.name;
        };

        const settingsToExport = {
            version: 1,
            exportedAt: new Date().toISOString(),
            settings: {
                main: {
                    personaPrompt,
                    userPrompt,
                    temperature,
                    selectedPresetName: getSelectedPresetName(selectedPresetId, presets),
                    presets: presets.map(({ name, personaPrompt, userPrompt, temperature }) => ({ name, personaPrompt, userPrompt, temperature }))
                },
                qg: {
                    personaPrompt: qgPersonaPrompt,
                    userPrompt: qgUserPrompt,
                    temperature: qgTemperature,
                    selectedPresetName: getSelectedPresetName(selectedQgPresetId, qgPresets),
                    presets: qgPresets.map(({ name, personaPrompt, userPrompt, temperature }) => ({ name, personaPrompt, userPrompt, temperature }))
                },
                refine: {
                    personaPrompt: refinePersonaPrompt,
                    userPrompt: refineUserPrompt,
                    temperature: refineTemperature,
                    selectedPresetName: getSelectedPresetName(selectedRefinePresetId, refinePresets),
                    presets: refinePresets.map(({ name, personaPrompt, userPrompt, temperature }) => ({ name, personaPrompt, userPrompt, temperature }))
                },
                diff: {
                    personaPrompt: diffPersonaPrompt,
                    userPrompt: diffUserPrompt,
                    temperature: diffTemperature,
                    selectedPresetName: getSelectedPresetName(selectedDiffPresetId, diffPresets),
                    presets: diffPresets.map(({ name, personaPrompt, userPrompt, temperature }) => ({ name, personaPrompt, userPrompt, temperature }))
                }
            }
        };

        const blob = new Blob([JSON.stringify(settingsToExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pdf-analyzer-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [
        personaPrompt, userPrompt, temperature, presets, selectedPresetId,
        qgPersonaPrompt, qgUserPrompt, qgTemperature, qgPresets, selectedQgPresetId,
        refinePersonaPrompt, refineUserPrompt, refineTemperature, refinePresets, selectedRefinePresetId,
        diffPersonaPrompt, diffUserPrompt, diffTemperature, diffPresets, selectedDiffPresetId
    ]);

    const handleImportSettings = useCallback(async (file: File) => {
        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const text = event.target?.result as string;
                    const data = JSON.parse(text);

                    // Validation
                    if (data.version !== 1 || !data.settings) {
                        throw new Error("ファイル形式が正しくありません。");
                    }
                    const requiredKeys = ['main', 'qg', 'refine', 'diff'];
                    if (!requiredKeys.every(key => key in data.settings)) {
                        throw new Error("ファイルに必要な設定セクションが不足しています。");
                    }

                    // Import main settings
                    const main = data.settings.main;
                    if (main) {
                        setPersonaPrompt(main.personaPrompt || DEFAULT_PERSONA_PROMPT);
                        setUserPrompt(main.userPrompt || DEFAULT_USER_PROMPT);
                        setTemperature(main.temperature ?? DEFAULT_TEMPERATURE);
                        const mainNewPresets: PromptPreset[] = Array.isArray(main.presets)
                            ? main.presets.map((p: any) => ({ id: self.crypto.randomUUID(), name: p.name, personaPrompt: p.personaPrompt, userPrompt: p.userPrompt, temperature: p.temperature }))
                            : [];
                        setPresets(mainNewPresets);
                        const mainSelectedPreset = main.selectedPresetName ? mainNewPresets.find(p => p.name === main.selectedPresetName) : undefined;
                        setSelectedPresetId(mainSelectedPreset ? mainSelectedPreset.id : 'default');
                    }

                    // Import QG settings
                    const qg = data.settings.qg;
                    if (qg) {
                        setQgPersonaPrompt(qg.personaPrompt || DEFAULT_QG_PERSONA_PROMPT);
                        setQgUserPrompt(qg.userPrompt || DEFAULT_QG_USER_PROMPT);
                        setQgTemperature(qg.temperature ?? DEFAULT_QG_TEMPERATURE);
                        const qgNewPresets: PromptPreset[] = Array.isArray(qg.presets)
                            ? qg.presets.map((p: any) => ({ id: self.crypto.randomUUID(), name: p.name, personaPrompt: p.personaPrompt, userPrompt: p.userPrompt, temperature: p.temperature }))
                            : [];
                        setQgPresets(qgNewPresets);
                        const qgSelectedPreset = qg.selectedPresetName ? qgNewPresets.find(p => p.name === qg.selectedPresetName) : undefined;
                        setSelectedQgPresetId(qgSelectedPreset ? qgSelectedPreset.id : 'default');
                    }

                    // Import Refine settings
                    const refine = data.settings.refine;
                    if (refine) {
                        setRefinePersonaPrompt(refine.personaPrompt || DEFAULT_REFINE_PERSONA_PROMPT);
                        setRefineUserPrompt(refine.userPrompt || DEFAULT_REFINE_USER_PROMPT);
                        setRefineTemperature(refine.temperature ?? DEFAULT_REFINE_TEMPERATURE);
                        const refineNewPresets: PromptPreset[] = Array.isArray(refine.presets)
                            ? refine.presets.map((p: any) => ({ id: self.crypto.randomUUID(), name: p.name, personaPrompt: p.personaPrompt, userPrompt: p.userPrompt, temperature: p.temperature }))
                            : [];
                        setRefinePresets(refineNewPresets);
                        const refineSelectedPreset = refine.selectedPresetName ? refineNewPresets.find(p => p.name === refine.selectedPresetName) : undefined;
                        setSelectedRefinePresetId(refineSelectedPreset ? refineSelectedPreset.id : 'default');
                    }

                    // Import Diff settings
                    const diff = data.settings.diff;
                    if (diff) {
                        setDiffPersonaPrompt(diff.personaPrompt || DEFAULT_DIFF_PERSONA_PROMPT);
                        setDiffUserPrompt(diff.userPrompt || DEFAULT_DIFF_USER_PROMPT);
                        setDiffTemperature(diff.temperature ?? DEFAULT_DIFF_TEMPERATURE);
                        const diffNewPresets: PromptPreset[] = Array.isArray(diff.presets)
                            ? diff.presets.map((p: any) => ({ id: self.crypto.randomUUID(), name: p.name, personaPrompt: p.personaPrompt, userPrompt: p.userPrompt, temperature: p.temperature }))
                            : [];
                        setDiffPresets(diffNewPresets);
                        const diffSelectedPreset = diff.selectedPresetName ? diffNewPresets.find(p => p.name === diff.selectedPresetName) : undefined;
                        setSelectedDiffPresetId(diffSelectedPreset ? diffSelectedPreset.id : 'default');
                    }
                    
                    resolve();

                } catch (e: any) {
                    reject(new Error(e.message || "ファイルの読み込みまたは解析に失敗しました。"));
                }
            };
            reader.onerror = () => {
                reject(new Error("ファイルの読み込みに失敗しました。"));
            };
            reader.readAsText(file);
        });
    }, [
        setPersonaPrompt, setUserPrompt, setTemperature, setPresets, setSelectedPresetId,
        setQgPersonaPrompt, setQgUserPrompt, setQgTemperature, setQgPresets, setSelectedQgPresetId,
        setRefinePersonaPrompt, setRefineUserPrompt, setRefineTemperature, setRefinePresets, setSelectedRefinePresetId,
        setDiffPersonaPrompt, setDiffUserPrompt, setDiffTemperature, setDiffPresets, setSelectedDiffPresetId
    ]);
      
    return {
        // State
        mode, analysisMode, openRouterApiKey, isApiKeyInvalid, openRouterModel, availableModels, isFreeModelSelected, isThinkingEnabled,
        pdfFile, isPdfPreviewOpen, analysisHistory, questionsMap, answeredQuestionsMap, customInstructionsMap, diffMap,
        isLoading, isGeneratingQuestions, isRefining, isGeneratingDiff, latestRefiningSourceId, latestDiffingSourceId, error, progressMessage,
        exchangeRateInfo, selectedOpenRouterModel,

        // AI Settings
        mainSettings: { personaPrompt, setPersonaPrompt, userPrompt, setUserPrompt, temperature, setTemperature, presets, selectedPresetId, ...mainPresetHandlers, openRouterModel },
        qgSettings: { personaPrompt: qgPersonaPrompt, setPersonaPrompt: setQgPersonaPrompt, userPrompt: qgUserPrompt, setUserPrompt: setQgUserPrompt, temperature: qgTemperature, setTemperature: setQgTemperature, presets: qgPresets, selectedPresetId: selectedQgPresetId, ...qgPresetHandlers, openRouterModel: qgOpenRouterModel, setOpenRouterModel: setQgOpenRouterModel },
        refineSettings: { personaPrompt: refinePersonaPrompt, setPersonaPrompt: setRefinePersonaPrompt, userPrompt: refineUserPrompt, setUserPrompt: setRefineUserPrompt, temperature: refineTemperature, setTemperature: setRefineTemperature, presets: refinePresets, selectedPresetId: selectedRefinePresetId, ...refinePresetHandlers, openRouterModel: refineOpenRouterModel, setOpenRouterModel: handleRefineModelChange },
        diffSettings: { personaPrompt: diffPersonaPrompt, setPersonaPrompt: setDiffPersonaPrompt, userPrompt: diffUserPrompt, setUserPrompt: setDiffUserPrompt, temperature: diffTemperature, setTemperature: setDiffTemperature, presets: diffPresets, selectedPresetId: selectedDiffPresetId, ...diffPresetHandlers, openRouterModel: diffOpenRouterModel, setOpenRouterModel: setDiffOpenRouterModel },

        // Setters
        setMode, setAnalysisMode, setOpenRouterApiKey, setIsApiKeyInvalid, setOpenRouterModel, setIsThinkingEnabled, setIsPdfPreviewOpen,
        
        // Handlers
        handleFileSelect, handleAnalysis, handleGenerateQuestions, handleRefineDocument, handleGenerateDiff, handleDownload, handleCopy,
        handleExportSettings, handleImportSettings,

        // Derived State
        isAnalyzeDisabled, isAnyLoading, showImageCapabilityWarning,
    };
};
