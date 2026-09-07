import { z } from "zod";

export const skillDetailsSchema = z.object({
  name: z.string().trim().min(1, "Enter a skill name."),
  description: z.string().trim().default(""),
});

export type SkillDetailsValues = z.infer<typeof skillDetailsSchema>;
