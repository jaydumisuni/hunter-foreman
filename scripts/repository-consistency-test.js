const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = relativePath => fs.existsSync(path.join(root, relativePath));
const readme = read('README.md');
const server = read('apps/demo/server.js');
const packageJson = JSON.parse(read('package.json'));

assert.ok(readme.includes('are implemented for the wider THETECHGUY business architecture.'));
assert.ok(readme.includes('The current runtime and automated tests are the source of truth.'));

const privateRepoSlug = ['hunter', 'forman', 'public', 'submission'].join('_');
const forbiddenPrivateReferences = [privateRepoSlug, `jaydumisuni/${privateRepoSlug}`];
const textExtensions = new Set([
  '.js', '.json', '.md', '.txt', '.yml', '.yaml', '.html', '.css', '.env', '.example', '.sh', '.ps1',
]);
const ignoredDirectories = new Set(['.git', 'node_modules']);

function textFiles(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) textFiles(absolute, output);
    else if (textExtensions.has(path.extname(entry.name).toLowerCase()) || entry.name === 'Dockerfile') output.push(absolute);
  }
  return output;
}

for (const file of textFiles(root)) {
  const content = fs.readFileSync(file, 'utf8');
  for (const forbidden of forbiddenPrivateReferences) {
    assert.ok(!content.includes(forbidden), `Private repository reference found in ${path.relative(root, file)}`);
  }
}

for (const temporary of [
  '.github/workflows/one-time-final-main-proof.yml',
  '.github/workflows/one-time-status-alignment.yml',
  '.github/workflows/app-status-alignment.yml',
  'status-card-diagnostics.txt',
  'FINAL_MAIN_PROOF_TRIGGER.txt',
  'scripts/finalize-main.py',
]) {
  assert.strictEqual(exists(temporary), false, `Temporary proof file remains: ${temporary}`);
}

for (const stale of [
  'Target integration for event workflows; not wired in this demo.',
  'Planned downstream module for invitations and RSVP.',
  'QR check-in direction is shown, not wired in this public demo.',
  'Left out until credentials and approvals are production-safe.',
  'Payment flow is separated for safety and not connected here.',
]) {
  assert.ok(!server.includes(stale), `Stale app wording remains: ${stale}`);
}

assert.ok(packageJson.scripts.test.includes('node scripts/status-label-test.js'));
assert.ok(packageJson.scripts.test.includes('node scripts/repository-consistency-test.js'));
console.log('Hunter Foreman repository consistency test passed');
