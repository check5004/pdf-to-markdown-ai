import type { OpenRouterModel, ModalityType, UsageInfo, Question } from '../types';

const API_BASE_URL = 'https://openrouter.ai/api/v1';
// Add recommended headers with safe ASCII values to prevent encoding errors.
const SITE_URL = 'https://user-app.com';
const APP_NAME = 'PDF Design Doc Analyzer';

const createHeaders = (apiKey: string) => ({
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': SITE_URL,
    'X-Title': APP_NAME,
});

export const fetchModels = async (apiKey: string): Promise<OpenRouterModel[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/models`, {
      headers: createHeaders(apiKey),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `HTTPエラー！ステータス: ${response.status}`);
    }

    const { data } = await response.json();

    if (!Array.isArray(data)) {
        console.error("OpenRouter API response for /models did not contain a 'data' array.", data);
        throw new Error("OpenRouterから無効なモデルリストが返されました。");
    }
    
    const visionModelKeywords = ['openai', 'google', 'xai', 'meta', 'anthropic'];

    return data
      .filter((model: any) => {
        if (!model || typeof model.id !== 'string') {
          return false;
        }
        return visionModelKeywords.some(keyword => model.id.toLowerCase().includes(keyword));
      })
      .map((model: any): OpenRouterModel => {
        // OpenRouter's API returns the price per token. We convert it to price per 1M tokens for display.
        const promptCostPerMillion = (parseFloat(model.pricing?.prompt ?? '0') * 1_000_000).toString();
        const completionCostPerMillion = (parseFloat(model.pricing?.completion ?? '0') * 1_000_000).toString();

        const modalities = new Set<ModalityType>();
        
        // Determine modalities from `architecture.input_modalities`. This is a broader check.
        if (Array.isArray(model.architecture?.input_modalities)) {
          for (const modality of model.architecture.input_modalities) {
            switch (modality) {
              case 'text':
                modalities.add('text');
                break;
              case 'image':
                modalities.add('image_input');
                break;
              case 'audio':
                modalities.add('audio_input');
                break;
              case 'video':
                modalities.add('video_input');
                break;
              // FIX: Add back the check for 'application' as a robust fallback.
              // Some models may indicate file/PDF support this way.
              case 'application':
                modalities.add('pdf_input');
                break;
              default:
                break;
            }
          }
        }

        // Correctly determine PDF support from `architecture.input_content_types`.
        // This is the newer, more specific method documented by OpenRouter.
        // See: https://openrouter.ai/docs/features/multimodal/pdfs
        if (Array.isArray(model.architecture?.input_content_types) && model.architecture.input_content_types.includes('application/pdf')) {
            modalities.add('pdf_input');
        }

        const supportedParameters = model.supported_parameters || [];
        // Determine tool use from `supported_parameters`
        if (Array.isArray(supportedParameters) && supportedParameters.includes('tools')) {
          modalities.add('tool_use');
        }
        
        // Correctly determine thinking support from `supported_parameters` property
        const supports_thinking = Array.isArray(supportedParameters) && supportedParameters.includes('reasoning');

        return {
          id: model.id,
          name: model.name || model.id,
          description: model.description || '',
          pricing: {
            prompt: promptCostPerMillion,
            completion: completionCostPerMillion,
          },
          context_length: model.context_length || 0,
          modality_types: Array.from(modalities),
          supports_thinking,
        };
      });

  } catch (error) {
    console.error("Error fetching OpenRouter models:", error);
    throw error;
  }
};

export const analyzeDocumentWithOpenRouter = async (
  prompt: string,
  base64Images: string[],
  base64Pdf: string | null,
  pdfFilename: string | null,
  modelId: string,
  apiKey: string,
  systemInstruction: string,
  temperature: number,
  extractedText?: string,
  isThinkingEnabled?: boolean
): Promise<{ result: string; debug: { request: any; response: any; generationResponse?: any }; usage: UsageInfo | null; }> => {
  const messages: any[] = [];
  
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }

  const userContent: any[] = [];

  if (extractedText) {
     const contextText = `以下のテキストは、後続の画像群の元となったPDFから抽出されたテキストコンテンツです。
画像だけでは読み取りが不正確な場合があるため、このテキストを正確な文字情報として最優先で参照してください。
画像からはレイアウト、図、表の構造を読み取り、テキスト情報と組み合わせて、最終的なドキュメントを生成してください。

--- BEGIN EXTRACTED TEXT ---
${extractedText}
--- END EXTRACTED TEXT ---
`;
    userContent.push({
      type: 'text',
      text: contextText,
    });
  }

  if (base64Pdf) {
    // PDF Directモード: OpenRouterのネイティブPDF処理機能を使用します。
    // PDF全体をBase64エンコードされたデータURLとして送信します。
    userContent.push({
      type: 'file',
      file: {
        filename: pdfFilename || 'document.pdf',
        file_data: base64Pdf,
      },
    });
  } else {
    // 画像ベースのモード: PDFの各ページを画像として送信します。
    // ネイティブPDF非対応モデルや、他の解析モードが選択された場合のフォールバックです。
    userContent.push(...base64Images.map(imgData => ({
      type: 'image_url',
      image_url: {
        url: imgData,
      },
    })));
  }

  userContent.push({ type: 'text', text: prompt }); // Add user prompt at the end

  messages.push({
    role: 'user',
    content: userContent,
  });

  const body: any = {
      model: modelId,
      messages: messages,
      temperature: temperature,
  };
  
  // The 'transforms' parameter is the correct way to enable thinking/reasoning mode.
  if (isThinkingEnabled) {
    body.transforms = ["middle-out"];
  }


  try {
    const chatCompletionsResponse = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        ...createHeaders(apiKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!chatCompletionsResponse.ok) {
      const errorData = await chatCompletionsResponse.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `HTTPエラー！ステータス: ${chatCompletionsResponse.status}`);
    }
    
    const data = await chatCompletionsResponse.json();
    const generationId = data.id;
    let cost = 0;
    let generationData: any = null;

    // Fetch generation details to get the cost
    if (generationId) {
        try {
            // Wait for a short period to allow the generation data to become available.
            await new Promise(resolve => setTimeout(resolve, 2000)); 

            const generationResponse = await fetch(`${API_BASE_URL}/generation?id=${generationId}`, {
                headers: createHeaders(apiKey),
            });
            if (generationResponse.ok) {
                generationData = await generationResponse.json();
                cost = generationData?.data?.total_cost || 0;
            } else {
                console.warn(`Could not fetch generation details for cost: ${generationResponse.statusText}`);
                generationData = { error: `Failed to fetch: ${generationResponse.status} ${generationResponse.statusText}` };
            }
        } catch (e) {
            console.warn("Error fetching generation details for cost:", e);
            generationData = { error: e instanceof Error ? e.message : String(e) };
        }
    }

    const usage: UsageInfo | null = data.usage ? {
      prompt_tokens: data.usage.prompt_tokens || 0,
      completion_tokens: data.usage.completion_tokens || 0,
      total_tokens: data.usage.total_tokens || 0,
      cost: cost, // Use the fetched cost
    } : null;

    // Sanitize debug payload to avoid storing large base64 strings in localStorage
    const sanitizedBody = JSON.parse(JSON.stringify(body)); // Deep copy
    if (sanitizedBody.messages) {
      sanitizedBody.messages.forEach((message: any) => {
        if (message.role === 'user' && Array.isArray(message.content)) {
          message.content.forEach((contentPart: any) => {
            if (contentPart.type === 'image_url' && contentPart.image_url && contentPart.image_url.url) {
              contentPart.image_url.url = contentPart.image_url.url.substring(0, 100) + '... [TRUNCATED]';
            }
            if (contentPart.type === 'file' && contentPart.file && contentPart.file.file_data) {
              contentPart.file.file_data = contentPart.file.file_data.substring(0, 100) + '... [TRUNCATED]';
            }
          });
        }
      });
    }

    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      return { result: data.choices[0].message.content, debug: { request: sanitizedBody, response: data, generationResponse: generationData }, usage };
    } else {
      throw new Error('OpenRouter APIからの無効な応答構造です。');
    }
    
  } catch (error) {
    console.error("Error calling OpenRouter API:", error);
    throw new Error(`OpenRouterからの応答の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
  }
};

export const generateClarificationQuestionsWithOpenRouter = async (
  markdown: string,
  modelId: string,
  apiKey: string,
  systemInstruction: string,
  userPrompt: string,
  temperature: number,
  isThinkingEnabled?: boolean
): Promise<{ questions: Question[]; debug: { request: any; response: any; }; usage: UsageInfo | null; }> => {
  const fullPrompt = `${userPrompt}
  
  レスポンスは以下のJSON形式の例に厳密に従ってください。他のテキストは含めないでください。
  \`\`\`json
  {
    "questions": [
      { 
        "question": "[3.1 ユーザー登録フロー] ユーザーIDの文字数制限について、仕様を明確にしてください。",
        "suggestions": ["8〜16文字の半角英数字", "12文字以上の半角英数字と記号"]
      },
      { 
        "question": "[4.2 エラーハンドリング] データベース接続エラー時の具体的な画面表示やユーザー通知方法を教えてください。",
        "suggestions": ["「サーバーエラーが発生しました」という汎用メッセージを表示", "メンテナンス中画面へ遷移させる", "自動的にリトライ処理を行う"]
      }
    ]
  }
  \`\`\`
  
  ドキュメント:
  \`\`\`markdown
  ${markdown}
  \`\`\`
  `;

  const messages = [
    { role: 'system', content: systemInstruction },
    { role: 'user', content: fullPrompt }
  ];

  const body: any = {
      model: modelId,
      messages: messages,
      temperature: temperature,
      response_format: { "type": "json_object" },
  };
  
  if (isThinkingEnabled) {
    body.transforms = ["middle-out"];
  }

  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { ...createHeaders(apiKey), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `HTTPエラー！ステータス: ${response.status}`);
    }
    
    const data = await response.json();
    let content = data.choices[0]?.message?.content;
    if (!content) throw new Error('APIからの応答にコンテンツが含まれていません。');
    
    // --- Robust JSON parsing ---
    // The model might return JSON wrapped in markdown or with extra text.
    // Find the start and end of the main JSON structure (object or array).
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    const firstBracket = content.indexOf('[');
    const lastBracket = content.lastIndexOf(']');

    let jsonString = '';

    // Prioritize object extraction, as it's the primary expected format.
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonString = content.substring(firstBrace, lastBrace + 1);
    } else if (firstBracket !== -1 && lastBracket > firstBracket) {
        // Fallback for cases where only an array is returned.
        jsonString = content.substring(firstBracket, lastBracket + 1);
    } else {
        throw new Error("AIの応答に有効なJSONオブジェクトまたは配列が含まれていません。");
    }

    try {
        let parsed = JSON.parse(jsonString);

        // If the parsed result is an array, wrap it in the expected object structure.
        if (Array.isArray(parsed)) {
            parsed = { questions: parsed };
        }

        if (!parsed.questions || !Array.isArray(parsed.questions)) {
          throw new Error("AIの応答が予期した形式（questions配列）ではありません。");
        }

        const questions: Question[] = parsed.questions.map((q: any) => ({
          id: self.crypto.randomUUID(),
          question: q.question,
          answer: '',
          suggestions: q.suggestions || []
        })).filter(q => q.question);

        const usage: UsageInfo | null = data.usage ? {
          prompt_tokens: data.usage.prompt_tokens || 0,
          completion_tokens: data.usage.completion_tokens || 0,
          total_tokens: data.usage.total_tokens || 0,
          cost: 0, 
        } : null;

        return { questions, debug: { request: body, response: data }, usage };
    } catch (parseError) {
        console.error("Error parsing JSON from OpenRouter:", parseError);
        console.error("Cleaned content that failed parsing:", jsonString);
        console.error("Original content from API:", data.choices[0]?.message?.content);
        if (parseError instanceof SyntaxError) {
             throw new Error(`OpenRouterからの応答が不正なJSON形式でした。モデルが生成したJSONの構文に誤りがあります。(${parseError.message})`);
        }
        throw parseError;
    }
    
  } catch (error) {
    console.error("Error calling OpenRouter API for question generation:", error);
    throw new Error(`OpenRouterからの応答の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
  }
};

export const generateDiffWithOpenRouter = async (
  oldMarkdown: string,
  newMarkdown: string,
  modelId: string,
  apiKey: string,
  systemInstruction: string,
  userPrompt: string,
  temperature: number,
  isThinkingEnabled?: boolean,
): Promise<{ result: string; debug: { request: any; response: any; }; usage: UsageInfo | null; }> => {
  const fullPrompt = userPrompt
    .replace('{OLD_MARKDOWN}', oldMarkdown)
    .replace('{NEW_MARKDOWN}', newMarkdown);
  
  const messages = [
    { role: 'system', content: systemInstruction },
    { role: 'user', content: fullPrompt }
  ];

  const body: any = {
      model: modelId,
      messages: messages,
      temperature: temperature,
  };
  
  if (isThinkingEnabled) {
    body.transforms = ["middle-out"];
  }

  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { ...createHeaders(apiKey), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `HTTPエラー！ステータス: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (!content) throw new Error('APIからの応答にコンテンツが含まれていません。');
    
    const usage: UsageInfo | null = data.usage ? {
      prompt_tokens: data.usage.prompt_tokens || 0,
      completion_tokens: data.usage.completion_tokens || 0,
      total_tokens: data.usage.total_tokens || 0,
      cost: 0,
    } : null;

    return { result: content, debug: { request: body, response: data }, usage };
  } catch (error) {
    console.error("Error calling OpenRouter API for diff generation:", error);
    throw new Error(`OpenRouterからの応答の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
  }
};