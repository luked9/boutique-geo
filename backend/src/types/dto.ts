import { z } from 'zod';

// Review Platforms
export const ReviewPlatformSchema = z.enum(['GOOGLE', 'YELP', 'APPLE_MAPS']);
export type ReviewPlatform = z.infer<typeof ReviewPlatformSchema>;

// Store DTOs
export const CreateStoreDtoSchema = z.object({
  name: z.string().min(1).max(255),
  primaryReviewPlatform: ReviewPlatformSchema,
  reviewDestinationUrl: z.string().url(),
});
export type CreateStoreDto = z.infer<typeof CreateStoreDtoSchema>;

export const UpdateStoreDtoSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  primaryReviewPlatform: ReviewPlatformSchema.optional(),
  reviewDestinationUrl: z.string().url().optional(),
});
export type UpdateStoreDto = z.infer<typeof UpdateStoreDtoSchema>;

// Rating DTO
export const RatingDtoSchema = z.object({
  starRating: z.number().int().min(1).max(5),
});
export type RatingDto = z.infer<typeof RatingDtoSchema>;

// Platform Click DTO
export const PlatformClickDtoSchema = z.object({
  platform: ReviewPlatformSchema,
});
export type PlatformClickDto = z.infer<typeof PlatformClickDtoSchema>;

// Session Status
export const SessionStatusSchema = z.enum(['PENDING', 'DECLINED', 'APPROVED', 'POSTED_INTENT']);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

// Onboarding Store DTO
export const CreateOnboardingStoreDtoSchema = z.object({
  name: z.string().min(1).max(255),
  posProvider: z.enum(['SHOPIFY', 'SQUARE', 'LIGHTSPEED']),
  googleMapsUrl: z.string().url(),
  shopDomain: z.string().optional(),
});
export type CreateOnboardingStoreDto = z.infer<typeof CreateOnboardingStoreDtoSchema>;
