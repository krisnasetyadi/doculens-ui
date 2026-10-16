import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(1, "Enter your name"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Use at least 8 characters").max(72, "Use 72 characters or fewer"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Enter the same password again",
    path: ["confirmPassword"],
  });
export type RegisterFormValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string(),
  })
  .refine((data) => data.next === data.confirm, {
    message: "Enter the same new password again",
    path: ["confirm"],
  });
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export const resetMemberPasswordSchema = z.object({
  newPassword: z.string().min(8, "Use at least 8 characters"),
});
export type ResetMemberPasswordFormValues = z.infer<typeof resetMemberPasswordSchema>;

export const addMemberSchema = z.object({
  newEmail: z.string().email("Enter a valid email").max(50, "Use 50 characters or fewer"),
  newPw: z.string().min(8, "Use at least 8 characters").max(50, "Use 50 characters or fewer"),
  // Blank → the workspace's Default Token Allocation (MS-402).
  newAllocation: z
    .string()
    .trim()
    .refine((v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 0), {
      message: "Enter a whole number of 0 or more, or leave it blank for the default",
    }),
});
export type AddMemberFormValues = z.infer<typeof addMemberSchema>;

export const updateNameSchema = z.object({
  name: z.string().min(1, "Enter your name").max(100, "Use 100 characters or fewer"),
});
export type UpdateNameFormValues = z.infer<typeof updateNameSchema>;

export const editMemberSchema = z.object({
  name: z.string().max(100, "Use 100 characters or fewer"),
});
export type EditMemberFormValues = z.infer<typeof editMemberSchema>;
