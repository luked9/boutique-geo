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
   * Maps star rating to appropriate tone and style
   * All reviews are positive - lower stars just means shorter/simpler
   */
  private getToneForRating(rating: number): { tone: string; style: string; length: string } {
    switch (rating) {
      case 5:
        return {
          tone: 'absolutely thrilled and excited',
          style: 'Be enthusiastic! Share specific details about what you love. Sound like you\'re excitedly recommending this to your best friend.',
          length: '3 sentences with vivid details',
        };
      case 4:
        return {
          tone: 'very happy and impressed',
          style: 'Share what you liked most about your purchase. Be warm and genuine.',
          length: '2-3 sentences',
        };
      case 3:
        return {
          tone: 'pleased and satisfied',
          style: 'Keep it simple and positive. Mention what you bought and that you\'re happy with it.',
          length: '2 sentences',
        };
      case 1:
      case 2:
        return {
          tone: 'content and appreciative',
          style: 'Keep it brief and positive. Just mention the item and a simple nice thing about it.',
          length: '1 short sentence',
        };
      default:
        return {
          tone: 'happy',
          style: 'Be positive and simple.',
          length: '1-2 sentences',
        };
    }
  }

  /**
   * Generates fallback review template (used if AI fails)
   * Always positive regardless of rating
   */
  private generateFallbackReview(
    storeName: string,
    rating: number,
    items: LineItem[]
  ): string {
    const itemNames = items
      .slice(0, 2)
      .map((item) => item.name)
      .join(' and ');

    if (rating >= 4) {
      return `Love my new ${itemNames} from ${storeName}! Great quality and exactly what I was looking for.`;
    } else {
      return `Happy with my ${itemNames} from ${storeName}.`;
    }
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
      const { tone, style, length } = this.getToneForRating(rating);

      // Format items for prompt
      const itemsText = items.map((item) => `- ${item.quantity}x ${item.name}`).join('\n');

      const systemPrompt = `You are a happy customer writing a positive Google review for a boutique shop.

CRITICAL RULES:
- ALWAYS write a POSITIVE review, regardless of star rating
- NEVER use em dashes (—) or double hyphens (--)
- Every review must be DIFFERENT and unique

Voice: Authentic, warm, like telling a friend about a nice find.

More rules:
- Mention a SPECIFIC item you bought and something nice about it
- Include a sensory detail (how it feels, looks, fits) or emotion
- NO generic phrases like "highly recommend" or "excellent service"
- NO mentioning AI, discounts, sales, or promotions
- Vary your sentence starters (don't always start with "I")`;

      // Add randomness seed to encourage variety
      const variationHints = [
        'Focus on how the item looks.',
        'Focus on how the item feels.',
        'Mention why you needed this item.',
        'Describe the shopping experience.',
        'Talk about the quality you noticed.',
      ];
      const hint = variationHints[Math.floor(Math.random() * variationHints.length)];

      const userPrompt = `Review for: ${storeName}
Mood: ${tone}
${style}
Angle: ${hint}
Length: ${length}

Purchased:
${itemsText}

Write a POSITIVE review (${length}). No em dashes:`;

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
        max_tokens: 200,
        temperature: 0.95,
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
