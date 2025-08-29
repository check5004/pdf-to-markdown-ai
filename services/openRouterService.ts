
import type { OpenRouterModel, ModalityType, UsageInfo } from '../types';

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
    
    const visionModelKeywords = ['openai', 'google', 'xai', 'meta', 'anthropic'];

    return data
      .filter((model: any) => visionModelKeywords.some(keyword => model.id.toLowerCase().includes(keyword)))
      .map((model: any): OpenRouterModel => {
        // OpenRouter's API returns the price per token. We convert it to price per 1M tokens for display.
        const promptCostPerMillion = (parseFloat(model.pricing?.prompt ?? '0') * 1_000_000).toString();
        const completionCostPerMillion = (parseFloat(model.pricing?.completion ?? '0') * 1_000_000).toString();

        const modalities = new Set<ModalityType>();
        
        // Determine modalities from `architecture.input_modalities`
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
              default:
                break;
            }
          }
        }

        const supportedParameters = model.supported_parameters || [];
        // Determine tool use from `supported_parameters`
        if (Array.isArray(supportedParameters) && supportedParameters.includes('tools')) {
          modalities.add('tool_use');
        }
        
        // Correctly determine thinking support from `supported_parameters` property
        const supports_thinking = Array.isArray(supportedParameters) && supportedParameters.includes('reasoning');

        // --- START OF DEBUG LOG ---
        if (model.id.includes('google') || model.id.includes('flash')) {
          console.log(
            `[DEBUG] Model: ${model.id} | Supports Thinking: ${supports_thinking} | supported_parameters:`, 
            model.supported_parameters
          );
        }
        // --- END OF DEBUG LOG ---

        return {
          id: model.id,
          name: model.name,
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

  userContent.push(...base64Images.map(imgData => ({
    type: 'image_url',
    image_url: {
      url: imgData,
    },
  })));

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

    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      return { result: data.choices[0].message.content, debug: { request: body, response: data, generationResponse: generationData }, usage };
    } else {
      throw new Error('OpenRouter APIからの無効な応答構造です。');
    }
    
  } catch (error) {
    console.error("Error calling OpenRouter API:", error);
    throw new Error(`OpenRouterからの応答の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
  }
};