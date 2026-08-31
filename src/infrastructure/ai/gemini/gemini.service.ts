import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

export interface GeminiStructuredRequest<T> {
  systemPrompt: string;
  userPrompt: string;
  schemaDescription: string;
  fallback: T;
}

export class GeminiApiError extends Error {
  constructor(
    message: string,
    readonly code: 'QUOTA_EXCEEDED' | 'NOT_CONFIGURED' | 'API_ERROR',
  ) {
    super(message);
    this.name = 'GeminiApiError';
  }
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly model: GenerativeModel | null;
  private readonly embeddingModel: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('gemini.apiKey', '');
    this.embeddingModel = this.configService.get<string>(
      'gemini.embeddingModel',
      'text-embedding-004',
    );

    if (apiKey) {
      const client = new GoogleGenerativeAI(apiKey);
      this.model = client.getGenerativeModel({
        model: this.configService.get<string>(
          'gemini.model',
          'gemini-2.5-flash',
        ),
      });
    } else {
      this.model = null;
      this.logger.warn(
        'GEMINI_API_KEY not configured - AI features will use fallbacks',
      );
    }
  }

  isConfigured(): boolean {
    return this.model !== null;
  }

  private classifyError(message: string): GeminiApiError | null {
    const lower = message.toLowerCase();
    if (
      lower.includes('spending cap') ||
      lower.includes('quota') ||
      message.includes('429')
    ) {
      return new GeminiApiError(
        'Gemini API monthly spend limit reached. Increase your cap at https://ai.google.dev/gemini-api/docs/billing or use a new API key.',
        'QUOTA_EXCEEDED',
      );
    }
    if (
      lower.includes('api key') ||
      (lower.includes('invalid') && lower.includes('key'))
    ) {
      return new GeminiApiError(
        'Gemini API key is invalid or missing. Check GEMINI_API_KEY in platform/api/.env',
        'NOT_CONFIGURED',
      );
    }
    return null;
  }

  async generateText(prompt: string): Promise<string> {
    if (!this.model) {
      return 'AI is not configured. Please add GEMINI_API_KEY.';
    }

    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }

  async generateStructured<T>(request: GeminiStructuredRequest<T>): Promise<T> {
    if (!this.model) {
      return request.fallback;
    }

    const prompt = `${request.systemPrompt}

Return ONLY valid JSON matching this schema:
${request.schemaDescription}

User input:
${request.userPrompt}`;

    try {
      const text = await this.generateText(prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return request.fallback;
      }
      return JSON.parse(jsonMatch[0]) as T;
    } catch (error) {
      this.logger.error('Gemini structured generation failed', error);
      return request.fallback;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.model) {
      return [];
    }

    try {
      const result = await this.model.embedContent({
        content: { role: 'user', parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT',
        model: this.embeddingModel,
      } as never);

      const values = (result as { embedding?: { values?: number[] } }).embedding
        ?.values;
      return values ?? [];
    } catch (error) {
      this.logger.error('Embedding generation failed', error);
      return [];
    }
  }

  async parseDocument<T>(
    base64Data: string,
    mimeType: string,
    prompt: string,
    schemaDescription: string,
    fallback: T,
  ): Promise<T> {
    if (!this.model) {
      return fallback;
    }

    const fullPrompt = `${prompt}

Return ONLY valid JSON matching this schema:
${schemaDescription}`;

    try {
      const result = await this.model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType, data: base64Data } },
              { text: fullPrompt },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return fallback;
      return JSON.parse(jsonMatch[0]) as T;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Document parsing failed (${mimeType}, ${Math.round(base64Data.length / 1024)}KB b64): ${message}`,
      );

      const classified = this.classifyError(message);
      if (classified) throw classified;

      // Retry once for transient server errors (not quota)
      if (message.includes('503') || message.includes('500')) {
        try {
          await new Promise((r) => setTimeout(r, 2000));
          const retry = await this.model.generateContent({
            contents: [
              {
                role: 'user',
                parts: [
                  { inlineData: { mimeType, data: base64Data } },
                  { text: fullPrompt },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          });
          const retryText = retry.response.text();
          const retryMatch = retryText.match(/\{[\s\S]*\}/);
          if (retryMatch) return JSON.parse(retryMatch[0]) as T;
        } catch (retryError) {
          const retryMsg =
            retryError instanceof Error
              ? retryError.message
              : String(retryError);
          this.logger.error(`Document parsing retry failed: ${retryMsg}`);
          const retryClassified = this.classifyError(retryMsg);
          if (retryClassified) throw retryClassified;
        }
      }

      return fallback;
    }
  }
}
