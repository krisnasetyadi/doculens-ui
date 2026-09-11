import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters").max(72, "Maximum 72 characters"),
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

export const resetMemberPasswordSchema = z.object({
  newPassword: z.string().min(8, "At least 8 characters"),
});
export type ResetMemberPasswordFormValues = z.infer<typeof resetMemberPasswordSchema>;

export const addMemberSchema = z.object({
  newEmail: z.string().email("Enter a valid email").max(50, "Maximum 50 characters"),
  newPw: z.string().min(8, "At least 8 characters").max(50, "Maximum 50 characters"),
});
export type AddMemberFormValues = z.infer<typeof addMemberSchema>;

export const updateNameSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Maximum 100 characters"),
});
export type UpdateNameFormValues = z.infer<typeof updateNameSchema>;
