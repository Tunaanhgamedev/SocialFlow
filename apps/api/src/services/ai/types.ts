export interface AIGenerateRequest {
  videoTitle?: string;
  sourceContext?: string;
  targetPlatform: string;
  language: 'vi' | 'en';
  tone?: string;
  customPrompt?: string;
}

export interface AIGeneratedContent {
  title: string;
  caption: string;
  hashtags: string[];
  pinnedComment?: string;
  provider: string;
  model: string;
}

export interface IAIProvider {
  name: string;
  generateMetadata(request: AIGenerateRequest): Promise<AIGeneratedContent>;
  isConfigured(): boolean;
}
