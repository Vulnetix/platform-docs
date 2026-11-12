import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Scripts guard main() behind an entry-point check, so their CLI is driven in a
// child process. The child gets `fetchSrc` (JavaScript source for a fetch
// implementation) as globalThis.fetch before the script is imported with the
// given argv. Children inherit the test runner's coverage environment, so these
// runs also count towards coverage of main().
const root = fileURLToPath(new URL('..', import.meta.url));

export const runScript = (modPath, fetchSrc, argv = []) => spawnSync(process.execPath, ['--input-type=module', '-e', `
globalThis.fetch = ${fetchSrc};
process.argv = [process.execPath, ${JSON.stringify(modPath)}, ...${JSON.stringify(argv)}];
await import(${JSON.stringify('file://' + modPath)});
`], { cwd: root, encoding: 'utf8' });
