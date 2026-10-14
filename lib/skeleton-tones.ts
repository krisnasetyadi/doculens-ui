// The tones of the skeleton system. `text` is the default of <Skeleton>: a neutral tint, not
// bg-accent (accent is blue-tinted and sits ~1.15:1 against bg-card; text is 1.23:1 light and
// 1.19:1 dark). The others mirror what a real element is painted with, so a placeholder reads as
// the same row dimmed: an icon tile, a chip or button, a group label. Pass them as className.
export const SKELETON_TONE = {
  text: "bg-muted-foreground/15",
  chip: "bg-muted",
  tile: "bg-primary/10",
  label: "bg-primary/20",
} as const;
