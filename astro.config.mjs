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
