/** Feltöltés AI — csak ha Ollama elérhető és nincs kikapcsolva. */
export function isUploadAiEnabled(): boolean {
  if (process.env.UPLOAD_AI_ENABLED === 'false') return false;
  return Boolean(
    process.env.OLLAMA_URL ||
      process.env.NEXT_PUBLIC_OLLAMA_URL ||
      process.env.UPLOAD_AI_ENABLED === 'true',
  );
}

export function uploadAiDisabledMessage(): string {
  return 'Az AI javaslat lokálisan érhető el (OLLAMA_URL / ollama pull llama3). Élesben állítsd be a szervert vagy UPLOAD_AI_ENABLED=true.';
}

/** Képes keresés — Ollama vision (llava) ugyanazon a hoston. */
export function isVisualSearchEnabled(): boolean {
  if (process.env.VISUAL_SEARCH_ENABLED === 'false') return false;
  return isUploadAiEnabled() || process.env.VISUAL_SEARCH_ENABLED === 'true';
}

export function visualSearchDisabledMessage(): string {
  return 'A képes keresés lokálisan érhető el (OLLAMA_URL, ollama pull llava). Állítsd be a szervert vagy VISUAL_SEARCH_ENABLED=true.';
}
