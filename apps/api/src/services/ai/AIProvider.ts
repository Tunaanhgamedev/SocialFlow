import { config } from '../../config/index.js';
import { AIGenerateRequest, AIGeneratedContent, IAIProvider } from './types.js';

export class MockAIProvider implements IAIProvider {
  public name = 'mock';

  public isConfigured(): boolean {
    return true;
  }

  public async generateMetadata(request: AIGenerateRequest): Promise<AIGeneratedContent> {
    const isEn = request.language === 'en';
    const baseTitle = request.videoTitle || (isEn ? 'Stunning Cosplay Transformation' : 'Biến hình cosplay siêu đỉnh');

    if (isEn) {
      return {
        title: `✨ ${baseTitle} | Wait for the Ending!`,
        caption: `Which cosplay character is your favorite? Let me know in the comments below! 💕 Don't forget to like and share for more content!`,
        hashtags: ['#Cosplay', '#AnimeCosplay', '#CosDolove', '#CosplayGirl', '#Reels', '#Trending', '#Transformation'],
        pinnedComment: '🌟 Drop your favorite anime in the comments!',
        provider: 'mock',
        model: 'socialflow-mock-v1'
      };
    }

    return {
      title: `✨ ${baseTitle} | Pha biến hình cực phẩm!`,
      caption: `Bạn thấy màn cosplay này đỉnh không? Thả tim và follow để xem thêm nhiều video hấp dẫn mỗi ngày nhé! 💕 Chúc cả nhà xem video vui vẻ!`,
      hashtags: ['#Cosplay', '#AnimeCosplay', '#CosDolove', '#GiaiTri', '#ReelsVN', '#XuHuong', '#BienHinh'],
      pinnedComment: '👉 Bạn muốn màn cosplay nhân vật nào tiếp theo? Comment bên dưới nhé!',
      provider: 'mock',
      model: 'socialflow-mock-v1'
    };
  }
}

export class GeminiProvider implements IAIProvider {
  public name = 'gemini';

  public isConfigured(): boolean {
    return !!config.ai.geminiApiKey;
  }

  public async generateMetadata(request: AIGenerateRequest): Promise<AIGeneratedContent> {
    if (!this.isConfigured()) {
      console.warn('[GeminiProvider] GEMINI_API_KEY chưa cấu hình, fallback sang MockAIProvider');
      return new MockAIProvider().generateMetadata(request);
    }

    // Phase 1 scaffold: placeholder for actual Gemini 1.5/2.0 API call
    return {
      title: request.language === 'en' ? `[Gemini] ${request.videoTitle || 'Cosplay Highlights'}` : `[Gemini] ${request.videoTitle || 'Biến hình Cosplay đỉnh cao'}`,
      caption: `Tối ưu hóa caption bởi Gemini AI cho kênh ${request.targetPlatform}. Theo dõi kênh để đón xem những video mới nhất!`,
      hashtags: ['#Cosplay', '#GeminiAI', '#SocialFlow', '#Reels'],
      pinnedComment: 'Follow để xem trọn bộ nhé!',
      provider: 'gemini',
      model: 'gemini-1.5-flash'
    };
  }
}

export class OpenAIProvider implements IAIProvider {
  public name = 'openai';

  public isConfigured(): boolean {
    return !!config.ai.openaiApiKey;
  }

  public async generateMetadata(request: AIGenerateRequest): Promise<AIGeneratedContent> {
    if (!this.isConfigured()) {
      console.warn('[OpenAIProvider] OPENAI_API_KEY chưa cấu hình, fallback sang MockAIProvider');
      return new MockAIProvider().generateMetadata(request);
    }

    return {
      title: request.language === 'en' ? `[OpenAI] ${request.videoTitle || 'Viral Cosplay'}` : `[OpenAI] ${request.videoTitle || 'Cosplay triệu view'}`,
      caption: `Nội dung được tạo tự động qua OpenAI GPT cho nền tảng ${request.targetPlatform}.`,
      hashtags: ['#Cosplay', '#OpenAI', '#SocialFlow'],
      pinnedComment: 'Bình luận ý kiến của bạn nhé!',
      provider: 'openai',
      model: 'gpt-4o-mini'
    };
  }
}

export class AIService {
  private static instance: AIService;
  private providers: Map<string, IAIProvider> = new Map();

  private constructor() {
    this.registerProvider(new MockAIProvider());
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new OpenAIProvider());
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  public registerProvider(provider: IAIProvider): void {
    this.providers.set(provider.name, provider);
  }

  public getActiveProvider(): IAIProvider {
    const selected = this.providers.get(config.ai.activeProvider);
    if (selected && selected.isConfigured()) {
      return selected;
    }
    return this.providers.get('mock')!;
  }

  public async generateContent(request: AIGenerateRequest): Promise<AIGeneratedContent> {
    const provider = this.getActiveProvider();
    return provider.generateMetadata(request);
  }

  public getAvailableProviders(): { name: string; isConfigured: boolean; isActive: boolean }[] {
    const list: { name: string; isConfigured: boolean; isActive: boolean }[] = [];
    for (const [name, provider] of this.providers.entries()) {
      list.push({
        name,
        isConfigured: provider.isConfigured(),
        isActive: name === config.ai.activeProvider
      });
    }
    return list;
  }
}
