// The site is split into segments, one per product (and, later, one per
// group of CLI subcommands). A page belongs to the segment named by the first
// segment of its path under src/content/docs, and to the section named by the
// second. The sidebar shows only the current segment's sections.

export interface Section { id: string; title: string }
export interface Segment {
  id: string;
  title: string;
  // One sentence for the product directory on the home page.
  summary: string;
  // The page served at /<segment>/.
  home: string;
  // Where the top "Reference" link goes, when the segment has reference pages.
  reference?: string;
  // The segment's page in the Vulnetix console, when it has one.
  console?: string;
  sections: Section[];
}

// Software Factory is defined here; every other segment is a JSON file in
// src/segments/<id>.json with the same shape. ORDER is the order of the
// product directory on the home page; a segment missing from it sorts last.
const SOFTWARE_FACTORY: Segment = {
    id: 'software-factory',
    title: 'Software Factory',
    summary: 'Workflows, agents, hosts and evidence for automated software delivery, and the Belai CLI that runs the work.',
    home: 'software-factory/get-started/overview',
    reference: 'software-factory/reference/settings',
    console: 'https://www.vulnetix.com/resolve/factory',
    sections: [
      { id: 'get-started', title: 'Get started' },
      { id: 'control', title: 'Control' },
      { id: 'workflows', title: 'Workflows' },
      { id: 'runs', title: 'Runs' },
      { id: 'decisions', title: 'Decisions and review' },
      { id: 'workforce', title: 'Workforce' },
      { id: 'cost', title: 'Cost' },
      { id: 'evidence', title: 'Evidence' },
      { id: 'pix', title: 'Pix calls' },
      { id: 'belai', title: 'Belai CLI and TUI' },
      { id: 'reference', title: 'Reference' },
    ],
  };

const ORDER = [
  'cli', 'platform-iac', 'software-factory',
  'sca', 'sast', 'secrets', 'iac-scanning', 'malware',
  'sbom', 'vex', 'attestation', 'tea',
  'package-firewall', 'quality-gates', 'ai-firewall',
  'pix', 'mcp-server', 'vscode', 'browser-extension',
  'vulnerability-management', 'virtual-patching', 'siem', 'cloud-security',
  'compliance', 'organization', 'vdb-api',
];

const files = import.meta.glob<Segment>('../segments/*.json', { eager: true, import: 'default' });
const rank = (id: string) => {
  const i = ORDER.indexOf(id);
  return i < 0 ? ORDER.length : i;
};

export const SEGMENTS: Segment[] = [SOFTWARE_FACTORY, ...Object.values(files)]
  .sort((a, b) => rank(a.id) - rank(b.id) || a.title.localeCompare(b.title));

export const REPO_URL = 'https://github.com/Vulnetix/platform-docs';
export const CONSOLE_URL = 'https://www.vulnetix.com/';

// The site home (the product directory) has this id; it is not a content page.
export const HOME_ID = 'index';

export const segmentOf = (id: string) => SEGMENTS.find((s) => s.id === id.split('/')[0]);
export const sectionOf = (id: string) => {
  const seg = segmentOf(id);
  return seg?.sections.find((s) => s.id === id.split('/')[1]);
};

// Docs ids are paths without the extension. A segment's home page is served at
// /<segment>/, the site home at /.
export const hrefFor = (id: string) => {
  if (id === HOME_ID) return '/';
  const seg = SEGMENTS.find((s) => s.home === id);
  return seg ? `/${seg.id}/` : `/${id}/`;
};
