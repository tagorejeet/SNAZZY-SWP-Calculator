import { defineConfig } from 'vite';

// Configure Vite with relative base path ('./')
// This allows the production build to be deployed seamlessly into any subdirectory
// on https://snazzywealth.in/ (e.g. https://snazzywealth.in/financial-planning/)
// or on any subdomain without client-side routing conflicts.
export default defineConfig({
  base: './',
});
