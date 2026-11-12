import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    password: z.string().min(8).max(72),
    preferredLanguage: z.enum(["th", "en"]).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8).max(72),
  }),
});

export const forgotSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const resetSchema = z.object({
  body: z.object({
    token: z.string().min(20),
    password: z.string().min(8).max(72),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80).optional(),
    preferredLanguage: z.enum(["th", "en"]).optional(),
    preferredTheme: z.enum(["system", "light", "dark"]).optional(),
    timezone: z.string().min(3).max(64).optional(),
  }),
});
