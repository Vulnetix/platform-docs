import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEED, fc } from './property.mjs';
import { goLiteral, settingSpec, subParent, goSubcommands } from '../scripts/lib/go-source.mjs';

test('goLiteral drops the quotes from a string', () => {
  assert.equal(goLiteral('"UTC"'), 'UTC');
});

test('goLiteral shows a slice literal as a list', () => {
  assert.equal(goLiteral('[]any{}'), '[]');
  assert.equal(goLiteral('[]any{50, 80, 100}'), '[50, 80, 100]');
  assert.equal(goLiteral('[]string{"a", "b"}'), '["a", "b"]');
});

test('goLiteral shows a map literal as an object', () => {
  assert.equal(goLiteral('map[string]any{"mode": "all"}'), '{"mode": "all"}');
});

test('goLiteral removes digit separators from a number', () => {
  assert.equal(goLiteral('86_400_000'), '86400000');
  assert.equal(goLiteral('0.95'), '0.95');
});

test('goLiteral is idempotent', () => {
  fc.assert(fc.property(fc.string(), (x) => goLiteral(goLiteral(x)) === goLiteral(x)), { seed: SEED });
});

test('goLiteral leaves unbalanced quote runs alone', () => {
  assert.equal(goLiteral('""a'), '""a');
  assert.equal(goLiteral('"he said ""hi"""'), 'he said ""hi""');
});

test('settingSpec reads min, max, default, store and locked', () => {
  assert.deepEqual(settingSpec(', Min: 1, Max: 50, Default: feDefaultFanoutCap, Store: "factory"'), { min: '1', max: '50', default: 'feDefaultFanoutCap', store: 'factory' });
  assert.deepEqual(settingSpec(', Default: "x", Locked: true, Store: "sandbox"'), { default: 'x', locked: true, store: 'sandbox' });
});

test('settingSpec reads a whole slice or map default, not up to the first brace', () => {
  assert.equal(settingSpec(', Default: []any{}, Store: "factory", Check: fcCheckGlobs').default, '[]');
  assert.equal(settingSpec(', Default: []any{50, 80, 100}, Store: "factory"').default, '[50, 80, 100]');
  assert.equal(settingSpec(', Default: map[string]any{"mode": "all"}, Store: "factory"').default, '{"mode": "all"}');
});

test('settingSpec leaves out fields that are not there', () => {
  assert.deepEqual(settingSpec(''), {});
});

test('subParent names a file after its command, with listed exceptions', () => {
  assert.equal(subParent('rccmd.go'), 'rc');
  assert.equal(subParent('plugin.go'), 'plugin');
  assert.equal(subParent('agentfilescmd.go'), 'agent crew');
});

test('goSubcommands lists the cases of a subcommand switch', () => {
  const src = 'func pluginMain(args []string) int {\n\tswitch args[0] {\n\tcase "install", "add":\n\t\treturn 0\n\tcase "list":\n\t\treturn 0\n\t}\n}\n';
  assert.deepEqual(goSubcommands('plugin.go', src), ['plugin install', 'plugin add', 'plugin list']);
});

test('goSubcommands skips the cases of a switch on a flag value', () => {
  const src = '\tswitch args[0] {\n\tcase "kiro":\n\t}\n\tswitch strings.TrimSpace(*backend) {\n\tcase "keychain":\n\tcase "user-file":\n\t}\n';
  assert.deepEqual(goSubcommands('login.go', src), ['login kiro']);
});

test('goSubcommands reads nothing from main.go', () => {
  assert.deepEqual(goSubcommands('main.go', '\tswitch args[0] {\n\tcase "rc":\n\t}\n'), []);
});
