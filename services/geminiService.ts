
import { GoogleGenAI } from "@google/genai";
import type { UsageInfo } from "../types.ts";

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
    
    return { result: response.text, debug: { request: payload, response: response }, usage: null };

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini APIからの応答の取得に失敗しました: ${error.message}`);
    }
    throw new Error("Gemini APIからの応答の取得に失敗しました。");
  }
};