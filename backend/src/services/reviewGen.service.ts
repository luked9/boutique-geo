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
   */
  private getToneForRating(rating: number): { tone: string; style: string } {
    switch (rating) {
      case 5:
        return {
          tone: 'genuinely delighted and impressed',
          style: 'Share a specific moment or detail that made the experience special. Sound like you\'re excitedly telling a friend about a great find.',
        };
      case 4:
        return {
          tone: 'happy and satisfied',
          style: 'Highlight what you liked most. Sound confident and pleased with your purchase.',
        };
      case 3:
        return {
          tone: 'neutral but fair',
          style: 'Be balanced and factual about the experience.',
        };
      case 1:
      case 2:
        return {
          tone: 'calm and constructive',
          style: 'Be factual without being harsh. Focus on what could be improved.',
        };
      default:
        return {
          tone: 'neutral',
          style: 'Be straightforward and honest.',
        };
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
      const { tone, style } = this.getToneForRating(rating);

      // Format items for prompt
      const itemsText = items.map((item) => `- ${item.quantity}x ${item.name}`).join('\n');

      const systemPrompt = `You are a real customer writing a unique Google review for a boutique shop.

IMPORTANT: Every review must be DIFFERENT. Never repeat the same phrases or structure.

Voice: Authentic, casual, like texting a friend about a great find.

Rules:
- 2-3 sentences, varied structure each time
- Mention a SPECIFIC item you bought and one detail you love about it
- Include how it made you feel OR a sensory detail (texture, color, fit)
- NO generic phrases like "highly recommend" or "great service"
- NO mentioning AI, discounts, sales, or promotions
- Start your review differently each time (don't always start with "I" or "Just")`;

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

Purchased:
${itemsText}

Write a unique 2-3 sentence review:`;

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
