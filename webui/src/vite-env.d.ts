/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Build stamp injected by vite.config.ts (see the `define` block).
declare const __APP_COMMIT__: string;
declare const __APP_COMMIT_DATE__: string;
declare const __APP_BUILD_TIME__: string;

declare module '*.css' {
  const content: string;
  export default content;
}
