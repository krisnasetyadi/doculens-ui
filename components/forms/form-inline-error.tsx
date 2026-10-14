import { Notice } from "@/components/notice";

export function FormInlineError({ message }: { message: string }) {
  return <Notice tone="error">{message}</Notice>;
}
