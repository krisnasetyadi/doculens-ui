import { Lock, Users } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { SkillScope } from "@/services/types";

interface SkillAccessProps {
  value: SkillScope;
  onChange: (scope: SkillScope) => void;
  disabled?: boolean;
}

const OPTIONS = [
  { value: "personal", label: "Only me", description: "Keep this skill private to your account.", icon: Lock },
  { value: "team", label: "Entire team", description: "You and all your team members can use it.", icon: Users },
] as const;

export function SkillAccess({ value, onChange, disabled }: SkillAccessProps) {
  return (
    <RadioGroup
      aria-label="Who can use this skill"
      value={value}
      onValueChange={(scope) => onChange(scope as SkillScope)}
      disabled={disabled}
      className="gap-2"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors has-[[data-slot=radio-group-item]:focus-visible]:ring-2 has-[[data-slot=radio-group-item]:focus-visible]:ring-ring has-[[data-slot=radio-group-item]:focus-visible]:ring-offset-2 ${
              selected ? "border-primary bg-primary/[0.06]" : "border-border/60 bg-card/50"
            } ${disabled ? "cursor-not-allowed opacity-60" : selected ? "cursor-pointer" : "cursor-pointer hover:border-primary/40 hover:bg-accent/40"}`}
          >
            <Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">{option.label}</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{option.description}</span>
            </span>
            <RadioGroupItem value={option.value} aria-label={option.label} />
          </label>
        );
      })}
    </RadioGroup>
  );
}
