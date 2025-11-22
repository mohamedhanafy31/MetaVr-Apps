import { z } from 'zod';

// Application schemas
export const applicationSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  platform: z.enum(['mobile', 'web', 'desktop']),
  status: z.enum(['active', 'inactive', 'maintenance']),
  authRequired: z.boolean(),
  iconUrl: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastHealthCheck: z.date().nullable(),
});

export const createApplicationSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  platform: z.enum(['mobile', 'web', 'desktop']),
  authRequired: z.boolean(),
});

export const updateApplicationSchema = createApplicationSchema.partial();

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
});

export const confirmResetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
});

// API Response schemas
export const apiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.any().optional(),
  error: z.string().optional(),
});

// Pagination schemas
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(25),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Type exports
export type Application = z.infer<typeof applicationSchema>;
export type CreateApplication = z.infer<typeof createApplicationSchema>;
export type UpdateApplication = z.infer<typeof updateApplicationSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
export type ConfirmResetPasswordData = z.infer<typeof confirmResetPasswordSchema>;
export type ApiResponse = z.infer<typeof apiResponseSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
