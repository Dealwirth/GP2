/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    /** Groq-Schlüssel, beim Bau aus dem Repository-Secret eingesetzt. */
    readonly VITE_GROQ_KEY?: string;
  }
}

export {};

interface ImportMetaEnv {
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
