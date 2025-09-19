import { GoogleGenAI, Type } from "@google/genai";
import type { UsageInfo, Question } from "../types";

interface DocumentPayload {
  filename: string;
  images: string[];
  textContent?: string;
}

export const analyzeDocumentWithGemini = async (
  prompt: string, 
  documents: DocumentPayload[],
  systemInstruction: string,
  temperature: number,
): Promise<{ result: string; debug: { request: any; response: any }; usage: UsageInfo | null }> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini APIキーが設定されていません。API_KEY または GEMINI_API_KEY 環境変数を設定してください。");
  }
  const ai = new GoogleGenAI({ apiKey });

  // FIX: Consolidate all text parts into a single text block to improve model compatibility and parsing robustness.
  // This ensures the model receives one cohesive instruction block followed by all image data.
  const textParts: string[] = [prompt];

  for (const doc of documents) {
    if (doc.textContent) {
      const contextText = `以下のテキストは、後続の画像群の元となったPDF「${doc.filename}」から抽出されたテキストコンテンツです。
画像だけでは読み取りが不正確な場合があるため、このテキストを正確な文字情報として最優先で参照してください。
画像からはレイアウト、図、表の構造を読み取り、テキスト情報と組み合わせて、最終的なドキュメントを生成してください。

--- BEGIN EXTRACTED TEXT for ${doc.filename} ---
${doc.textContent}
--- END EXTRACTED TEXT for ${doc.filename} ---
`;
      textParts.push(contextText);
    }
  }

  const parts: any[] = [{ text: textParts.join('\n\n') }];
  
  for (const doc of documents) {
    const imageParts = doc.images.map(imgData => {
      const base64Data = imgData.split(',')[1];
      return {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data,
        },
      };
    });
    parts.push(...imageParts);
  }

  const payload = {
    model: 'gemini-2.5-flash',
    contents: { parts: parts },
    config: {
      systemInstruction: systemInstruction,
      temperature: temperature,
    }
  };

  try {
    const response = await ai.models.generateContent(payload);
    
    // Sanitize debug payload to avoid storing large base64 strings in localStorage
    const sanitizedPayload = JSON.parse(JSON.stringify(payload)); // Deep copy
    if (sanitizedPayload.contents && sanitizedPayload.contents.parts) {
      sanitizedPayload.contents.parts.forEach((part: any) => {
        if (part.inlineData && part.inlineData.data) {
          part.inlineData.data = part.inlineData.data.substring(0, 100) + '... [TRUNCATED]';
        }
      });
    }
    
    return { result: response.text, debug: { request: sanitizedPayload, response: response }, usage: null };

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini APIからの応答の取得に失敗しました: ${error.message}`);
    }
    throw new Error("Gemini APIからの応答の取得に失敗しました。");
  }
};


export const generateClarificationQuestions = async (
  markdown: string,
  systemInstruction: string,
  userPrompt: string,
  temperature: number,
): Promise<{ questions: Question[]; debug: { request: any; response: any }; usage: UsageInfo | null }> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini APIキーが設定されていません。");

  const ai = new GoogleGenAI({ apiKey });
  
  const fullPrompt = `${userPrompt}\n\nドキュメント:\n\`\`\`markdown\n${markdown}\n\`\`\``;

  const payload = {
    model: 'gemini-2.5-flash',
    contents: fullPrompt,
    config: {
      systemInstruction: systemInstruction,
      temperature: temperature,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: {
                  type: Type.STRING,
                  description: 'ユーザーへの質問文。質問の冒頭には、関連するドキュメント本体の箇所（セクション名など）を `[参照箇所]` の形式で含めること。参照箇所として `[未確定事項]` は使用しないこと。',
                },
                suggestions: {
                  type: Type.ARRAY,
                  description: '質問に対する回答のサジェスト（1〜3個）',
                  items: {
                    type: Type.STRING,
                  },
                },
              },
              required: ['question']
            }
          }
        },
        required: ['questions']
      },
    }
  };

  try {
    const response = await ai.models.generateContent(payload);
    const jsonStr = response.text.trim();
    const parsed = JSON.parse(jsonStr);
    
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error("AIの応答が予期した形式（questions配列）ではありません。");
    }

    const questions: Question[] = parsed.questions.map((q: any) => ({
      id: self.crypto.randomUUID(),
      question: q.question,
      answer: '',
      suggestions: q.suggestions || [],
    }));

    return { questions, debug: { request: payload, response }, usage: null };

  } catch (error) {
    console.error("Error calling Gemini API for question generation:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini APIからの応答の取得に失敗しました: ${error.message}`);
    }
    throw new Error("Gemini APIからの応答の取得に失敗しました。");
  }
};

export const generateDiffWithGemini = async (
  oldMarkdown: string,
  newMarkdown: string,
  systemInstruction: string,
  userPrompt: string,
  temperature: number,
): Promise<{ result: string; debug: { request: any; response: any }; usage: UsageInfo | null }> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini APIキーが設定されていません。");

  const ai = new GoogleGenAI({ apiKey });

  const fullPrompt = userPrompt
    .replace('{OLD_MARKDOWN}', oldMarkdown)
    .replace('{NEW_MARKDOWN}', newMarkdown);

  const payload = {
    model: 'gemini-2.5-flash',
    contents: fullPrompt,
    config: {
      systemInstruction: systemInstruction,
      temperature: temperature,
    }
  };

  try {
    const response = await ai.models.generateContent(payload);
    return { result: response.text, debug: { request: payload, response }, usage: null };
  } catch (error) {
    console.error("Error calling Gemini API for diff generation:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini APIからの応答の取得に失敗しました: ${error.message}`);
    }
    throw new Error("Gemini APIからの応答の取得に失敗しました。");
  }
};