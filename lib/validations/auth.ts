import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters").max(72, "At most 72 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });
export type RegisterFormValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Current password is required"),
    next: z.string().min(8, "At least 8 characters"),
    confirm: z.string(),
  })
  .refine((data) => data.next === data.confirm, {
    message: "New passwords do not match.",
    path: ["confirm"],
  });
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export const adminResetPasswordSchema = z.object({
  resetEmail: z.string().email("Enter a valid email"),
  resetPw: z.string().min(8, "At least 8 characters"),
});
export type AdminResetPasswordFormValues = z.infer<typeof adminResetPasswordSchema>;

export const addMemberSchema = z.object({
  newEmail: z.string().email("Enter a valid email"),
  newPw: z.string().min(8, "At least 8 characters"),
});
export type AddMemberFormValues = z.infer<typeof addMemberSchema>;
