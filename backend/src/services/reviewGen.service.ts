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
   * @returns Generated review text (40-80 words)
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
- NEVER use em dashes (\u2014) or en dashes (\u2013) or double hyphens (--). NEVER. Not even once.
- Every single review MUST be completely unique and different from any other
- Write between 40 and 80 words. This is a strict range.

Voice: Authentic, warm, like telling a friend about a nice find.

More rules:
- Mention a SPECIFIC item you bought and something nice about it
- Include a sensory detail (how it feels, looks, fits) or emotion
- NO generic phrases like "highly recommend" or "excellent service"
- NO mentioning AI, discounts, sales, or promotions
- Vary your sentence structure, vocabulary, and opening words every time
- Use different adjectives and descriptions each time`;

      // Add randomness seed to encourage variety
      const variationHints = [
        'Focus on how the item looks when you wear it.',
        'Focus on how the item feels against your skin.',
        'Mention why you needed this item in your life.',
        'Describe the moment you first saw the item.',
        'Talk about the quality and craftsmanship you noticed.',
        'Mention how a friend or family member reacted to it.',
        'Describe how it fits into your existing wardrobe.',
        'Talk about the texture or material.',
        'Describe the color and how it catches light.',
        'Mention where you plan to wear or use it first.',
        'Talk about how it made you feel when you tried it on.',
        'Describe what caught your eye about it initially.',
      ];
      const hint = variationHints[Math.floor(Math.random() * variationHints.length)];

      // Random structure hint for even more variety
      const structureHints = [
        'Start with the item name.',
        'Start with an emotion or feeling.',
        'Start with a detail about the store visit.',
        'Start with what you were looking for.',
        'Start with a compliment about the item.',
        'Start by describing the moment you found it.',
      ];
      const structureHint = structureHints[Math.floor(Math.random() * structureHints.length)];

      const userPrompt = `Review for: ${storeName}
Mood: ${tone}
${style}
Angle: ${hint}
Structure: ${structureHint}
Word count: strictly between 40 and 80 words.
Random seed: ${Date.now()}

Purchased:
${itemsText}

Write a POSITIVE review (40-80 words). ABSOLUTELY NO em dashes or en dashes:`;

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
        max_tokens: 300,
        temperature: 1.0,
      });

      let reviewText = completion.choices[0]?.message?.content?.trim();

      if (!reviewText) {
        logger.warn('AI returned empty review, using fallback');
        return this.generateFallbackReview(storeName, rating, items);
      }

      // Strip any em dashes or en dashes that slipped through
      reviewText = reviewText.replace(/[\u2014\u2013]/g, ',');

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
