// Some CI and the agent harness export GIT_DIR/GIT_WORK_TREE and the git object
// paths, so git run by a test would find the real repository even from a bare
// tmpdir. These helpers keep fixture repositories hermetic.

const isGit = (k) => k.startsWith('GIT_');

// An environment for a child process: the current one without any GIT_* var,
// plus `extra`.
export const withoutGitEnv = (extra = {}) => ({
  ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !isGit(k))),
  ...extra,
});

// Runs fn with every GIT_* var removed from process.env, for code that spawns
// git in-process, and puts them back afterwards.
export const hidingGitEnv = (fn) => {
  const saved = Object.fromEntries(Object.entries(process.env).filter(([k]) => isGit(k)));
  for (const k of Object.keys(saved)) delete process.env[k];
  try {
    return fn();
  } finally {
    Object.assign(process.env, saved);
  }
};
