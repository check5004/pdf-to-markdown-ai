import { GoogleGenAI, Type } from "@google/genai";
import type { UsageInfo, Question } from "../types";

export const analyzeDocumentWithGemini = async (
  prompt: string, 
  base64Images: string[],
  systemInstruction: string,
  temperature: number,
  extractedText?: string
): Promise<{ result: string; debug: { request: any; response: any }; usage: UsageInfo | null }> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini APIキーが設定されていません。API_KEY または GEMINI_API_KEY 環境変数を設定してください。");
  }
  const ai = new GoogleGenAI({ apiKey });

  const imageParts = base64Images.map(imgData => {
    const base64Data = imgData.split(',')[1];
    return {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Data,
      },
    };
  });

  const parts: any[] = [];

  if (extractedText) {
    const contextText = `以下のテキストは、後続の画像群の元となったPDFから抽出されたテキストコンテンツです。
画像だけでは読み取りが不正確な場合があるため、このテキストを正確な文字情報として最優先で参照してください。
画像からはレイアウト、図、表の構造を読み取り、テキスト情報と組み合わせて、最終的なドキュメントを生成してください。

--- BEGIN EXTRACTED TEXT ---
${extractedText}
--- END EXTRACTED TEXT ---
`;
    parts.push({ text: contextText });
  }

  parts.push(...imageParts);
  parts.push({ text: prompt }); // Add user prompt at the end

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
