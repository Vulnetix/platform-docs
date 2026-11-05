// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { satteri } from '@astrojs/markdown-satteri';
import { callouts, pendingLinks } from './src/plugins/docs-markdown.mjs';
import { homeRedirects } from './src/lib/home-redirects.mjs';

export default defineConfig({
  // Keep in sync with public/CNAME and terraform/dns.tf.
  site: 'https://docs.vulnetix.com',
  base: '/',
  trailingSlash: 'always',
  markdown: {
    processor: satteri({ hastPlugins: [callouts, pendingLinks] }),
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' }, wrap: false },
  },
  vite: { plugins: [tailwindcss()] },
  // A Content-Security-Policy <meta> on every page (GitHub Pages cannot send
  // headers), with the sha256 of each inline script and style. scripts/sri.mjs
  // adds the hash of the import map it writes after the build. Everything the
  // site loads is its own: no external scripts, styles, fonts or images.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ],
      // Pagefind compiles its search index reader from WebAssembly.
      scriptDirective: { resources: ["'self'", "'wasm-unsafe-eval'"] },
      // Shiki colours code with style="…" attributes, which hashes cannot cover.
      styleDirective: { resources: ["'self'", { resource: "'unsafe-inline'", kind: 'attribute' }] },
    },
  },
  // Pages that moved when the planned Platform IaC pages became real. Static
  // meta-refresh pages, so a link to the old address still lands.
  redirects: {
    '/platform-iac/planned/cel': '/platform-iac/reference/cel/',
    '/platform-iac/planned/kind-catalogue': '/platform-iac/kinds/catalogue/',
    '/platform-iac/planned/terraform': '/platform-iac/terraform/',
    '/platform-iac/planned/vex-sources': '/platform-iac/guides/vex-sources/',
    '/vex/suppression/vex-sources-planned': '/platform-iac/guides/vex-sources/',
    // Each segment home's own path, to the segment root that serves it.
    ...homeRedirects(),
  },
});
