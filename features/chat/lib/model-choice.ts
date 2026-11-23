import type { AvailableModelsResponse, ModelSelection } from "@/services/types";

/** The chat model in use (MS-1192): the user's last pick, else the server's default, else the first
 * model the dropdown offers. A model the server does not list is never used, so a saved GPT pick is
 * dropped once the server has no OpenAI key. Until the list has loaded (and when it fails to load)
 * this is `fallback`: the server render and the first client render then agree. */
export function chosenModel(
  saved: ModelSelection | null,
  available: AvailableModelsResponse | null,
  fallback: ModelSelection,
): ModelSelection {
  if (!available) return fallback;
  const listed = (choice: ModelSelection | null | undefined): choice is ModelSelection =>
    typeof choice?.model === "string" && Boolean(available.available_models?.[choice.provider]?.includes(choice.model));
  const serverDefault = { provider: available.default_provider, model: available.default_model };
  if (listed(saved)) return { provider: saved.provider, model: saved.model };
  if (listed(serverDefault)) return serverDefault;
  // The dropdown lists Gemini first, then GPT.
  for (const provider of ["gemini", "openai"] as const) {
    const model = available.available_models?.[provider]?.[0];
    if (model) return { provider, model };
  }
  return fallback;
}
