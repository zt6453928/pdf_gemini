export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface TranslatedPage {
  pageNumber: number;
  originalImage: string; // Base64
  translatedHtml: string; // HTML string from Gemini/DeepLX
  status: 'pending' | 'translating' | 'completed' | 'error';
  errorMessage?: string;
}

export interface TranslationStats {
  totalTime: number;
  totalPages: number;
}

export type ApiProvider = 'openai' | 'deeplx';

export interface ApiConfig {
  provider: ApiProvider;
  baseUrl: string;
  apiKey: string;
  modelName: string; // Used for OpenAI
}