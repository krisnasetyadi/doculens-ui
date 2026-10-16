import { z } from "zod";

import { HTTP_URL_MESSAGE, isHttpUrl } from "@/lib/validations/url";

/** Sources → Database → add connection. The server only takes PostgreSQL URLs. */
export const databaseConnectionSchema = z.object({
  label: z.string().trim(),
  url: z
    .string()
    .trim()
    .min(1, "Enter a connection URL")
    .refine((value) => /^postgres(ql)?:\/\//i.test(value), {
      message: "Enter a URL that starts with postgresql:// or postgres://",
    }),
});
export type DatabaseConnectionValues = z.infer<typeof databaseConnectionSchema>;

/** Sources → Public Links → add link. */
export const publicLinkSchema = z.object({
  title: z.string().trim(),
  url: z.string().trim().min(1, "Enter a link URL").refine(isHttpUrl, { message: HTTP_URL_MESSAGE }),
});
export type PublicLinkValues = z.infer<typeof publicLinkSchema>;

/** Sources → Files → create or rename a folder. */
export const folderNameSchema = z.object({
  name: z.string().trim().min(1, "Enter a folder name"),
});
export type FolderNameValues = z.infer<typeof folderNameSchema>;

/** Sources → Telegram → connect, step 1. */
export const telegramAccountSchema = z.object({
  label: z.string().trim(),
  apiId: z
    .string()
    .trim()
    .min(1, "Enter the API ID")
    .regex(/^[1-9]\d*$/, "Enter the API ID as a number, as shown on my.telegram.org"),
  apiHash: z.string().trim().min(1, "Enter the API hash"),
  phone: z
    .string()
    .trim()
    .min(1, "Enter the phone number")
    .refine((value) => /^\+?[\d\s()-]+$/.test(value) && value.replace(/\D/g, "").length >= 7, {
      message: "Enter the phone number with its country code, for example +62 812 3456 7890",
    }),
});
export type TelegramAccountValues = z.infer<typeof telegramAccountSchema>;

/** Step 2: the login code Telegram sends to the account. */
export const telegramCodeSchema = z.object({
  code: z.string().trim().min(1, "Enter the code Telegram sent you"),
});
export type TelegramCodeValues = z.infer<typeof telegramCodeSchema>;

/** Step 3, only for accounts with two-step verification. Not trimmed: spaces can be part of a password. */
export const telegramPasswordSchema = z.object({
  password: z.string().min(1, "Enter your two-step verification password"),
});
export type TelegramPasswordValues = z.infer<typeof telegramPasswordSchema>;
