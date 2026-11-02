// The non-Software Factory inventory: the Cobra tree reader (scripts/lib/cobra.mjs)
// and the coverage rules for CLI commands, Platform IaC kinds and routes, and
// Guardian routes (scripts/lib/coverage.mjs).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cobraTree } from '../scripts/lib/cobra.mjs';
import { needle, checkCoverage } from '../scripts/lib/coverage.mjs';

const go = (file, src) => ({ file, src });

test('cobraTree reads package-level commands, builder funcs and AddCommand edges', () => {
  const paths = cobraTree([
    go('cmd/root.go', `package cmd
var rootCmd = &cobra.Command{
	Use: "vulnetix",
}
`),
    go('cmd/auth.go', `package cmd
var authCmd = &cobra.Command{
	Use:   "auth",
	Short: "x",
}
var loginCmd = &cobra.Command{
	Use: "login [flags]",
}
func init() {
	rootCmd.AddCommand(authCmd)
	authCmd.AddCommand(loginCmd, newLogoutCommand())
}
func newLogoutCommand() *cobra.Command {
	return &cobra.Command{
		Use: "logout",
	}
}
`),
    go('cmd/jail.go', `package cmd
func newJailCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "jail",
		Short: "y",
	}
	cmd.AddCommand(newJailListCommand())
	return cmd
}
func newJailListCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use: "list",
	}
	return cmd
}
func init() { rootCmd.AddCommand(newJailCommand()) }
`),
    go('cmd/vdb.go', `package cmd
var vdbCmd = &cobra.Command{
	Use: "vdb",
}
var oldCmd = &cobra.Command{
	Use:    "old-name",
	Hidden: true,
}
func init() {
	rootCmd.AddCommand(vdbCmd)
	vdbCmd.AddCommand(oldCmd)
	vdbCmd.AddCommand(&cobra.Command{
		Use: "inline",
	})
	for _, c := range []*cobra.Command{
		oldCmd,
	} {
		vdbCmd.AddCommand(c)
	}
}
`),
  ]);
  assert.deepEqual([...paths.keys()].sort(), ['auth', 'auth login', 'auth logout', 'jail', 'jail list', 'vdb', 'vdb inline']);
  assert.equal(paths.get('jail list').file, 'cmd/jail.go');
});

test('needles for the new atom kinds', () => {
  const a = (kind, value) => ({ id: `${kind}:${value}`, kind, value, sources: [] });
  assert.equal(needle(a('cli-command', 'auth login')), 'auth login');
  assert.equal(needle(a('iac-kind', 'QualityGate')), 'QualityGate');
  assert.equal(needle(a('config-route', 'POST /v1/config/plan')), '/config/plan');
  assert.equal(needle(a('guardian-route', 'GET /v1/guardian/rules/{id}')), '/rules/{id}');
});

test('an atom named on any of a feature\'s pages counts, and every page must exist', () => {
  const at = { id: 'cli-command:auth login', kind: 'cli-command', value: 'auth login', sources: [] };
  const ft = { id: 'f', page: '/a', pages: ['/b'], match: ['^cli-command:'], status: 'drafted', area: 'x', title: 'f' };
  assert.equal(checkCoverage([at], [ft], (p) => ({ '/a': 'nothing', '/b': 'run auth login' })[p] ?? null).ok, true);
  assert.equal(checkCoverage([at], [ft], (p) => ({ '/a': 'nothing', '/b': 'nothing' })[p] ?? null).missing.length, 1);
  assert.equal(checkCoverage([at], [ft], (p) => ({ '/a': 'auth login' })[p] ?? null).problems.length, 1);
});
