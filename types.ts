
export enum Mode {
  GEMINI = 'gemini',
  OPENROUTER = 'openrouter'
}

export type AnalysisMode = 'image-only' | 'image-with-text';

export interface OpenRouterModelPricing {
  prompt: string;
  completion: string;
}

export type ModalityType = 'text' | 'image_input' | 'audio_input' | 'video_input' | 'tool_use';

export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  pricing: OpenRouterModelPricing;
  context_length: number;
  modality_types: ModalityType[];
  supports_thinking?: boolean;
}


export interface PromptPreset {
  id: string;
  name: string;
  personaPrompt: string;
  userPrompt: string;
  temperature: number;
}

export interface UsageInfo {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
}