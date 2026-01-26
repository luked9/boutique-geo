import OpenAI from 'openai';
import { logger } from '../lib/logger';
import { config } from '../config';

/**
 * AI review generation service using OpenAI SDK
 * Generates natural, contextual reviews based on purchase data
 */

interface LineItem {
  name: string;
  quantity: number;
}

export class ReviewGenService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.AI_API_KEY,
      baseURL: config.AI_API_BASE_URL,
    });

    logger.info(
      { model: config.AI_MODEL, baseURL: config.AI_API_BASE_URL },
      'ReviewGenService initialized'
    );
  }

  /**
   * Maps star rating to appropriate tone
   */
  private getToneForRating(rating: number): string {
    switch (rating) {
      case 5:
        return 'enthusiastic, warm';
      case 4:
        return 'positive, confident';
      case 3:
        return 'neutral, polite';
      case 1:
      case 2:
        return 'calm, factual, non-defamatory';
      default:
        return 'neutral, polite';
    }
  }

  /**
   * Generates fallback review template (used if AI fails)
   */
  private generateFallbackReview(
    storeName: string,
    rating: number,
    items: LineItem[]
  ): string {
    const toneMap: Record<number, string> = {
      5: 'wonderful',
      4: 'great',
      3: 'okay',
      2: 'mediocre',
      1: 'disappointing',
    };

    const tone = toneMap[rating] || 'okay';
    const itemNames = items
      .slice(0, 2)
      .map((item) => item.name)
      .join(' and ');

    return `I had a ${tone} experience at ${storeName}. I purchased ${itemNames}.`;
  }

  /**
   * Generates AI-powered review text
   * @param storeName - Name of the store
   * @param rating - Star rating (1-5)
   * @param items - Array of purchased items with name and quantity
   * @returns Generated review text (max 400 chars)
   */
  async generateReview(
    storeName: string,
    rating: number,
    items: LineItem[]
  ): Promise<string> {
    try {
      const tone = this.getToneForRating(rating);

      // Format items for prompt
      const itemsText = items.map((item) => `- ${item.quantity}x ${item.name}`).join('\n');

      const systemPrompt = `You write short, natural customer reviews for local boutiques.
You must be truthful and only reference purchase items provided.
No mention of AI. No promotions. 1–3 sentences.`;

      const userPrompt = `Store: ${storeName}
Star rating: ${rating}/5
Items purchased:
${itemsText}
Write a ${tone} review (1–3 sentences). Avoid unverifiable claims.`;

      logger.info(
        { storeName, rating, itemCount: items.length },
        'Generating AI review'
      );

      const completion = await this.openai.chat.completions.create({
        model: config.AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      let reviewText = completion.choices[0]?.message?.content?.trim();

      if (!reviewText) {
        logger.warn('AI returned empty review, using fallback');
        return this.generateFallbackReview(storeName, rating, items);
      }

      // Enforce max 400 characters
      if (reviewText.length > 400) {
        reviewText = reviewText.substring(0, 397) + '...';
      }

      logger.info(
        { reviewLength: reviewText.length },
        'AI review generated successfully'
      );

      return reviewText;
    } catch (error) {
      logger.error({ error, storeName, rating }, 'Failed to generate AI review, using fallback');
      return this.generateFallbackReview(storeName, rating, items);
    }
  }
}

export const reviewGenService = new ReviewGenService();
