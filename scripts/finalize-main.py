from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

readme_path = ROOT / 'README.md'
readme = readme_path.read_text(encoding='utf-8')
pairs = [
    (
        'These capabilities were completed and verified through the hackathon implementation and are considered implemented for the wider THETECHGUY business architecture.',
        'These capabilities were completed and verified through the hackathon implementation and are implemented for the wider THETECHGUY business architecture.',
    ),
    (
        'App Bridge view showing which business modules are demo-ready, planned, under maintenance, or not connected. These screenshot labels capture the submitted public-demo state; the business implementation boundary is clarified above so “not connected” is not mistaken for “unbuilt.”',
        'This screenshot preserves the recorded submission-state labels. The current repository runtime uses **Not connected** for existing business systems excluded from the public demo, and **Planned** only for genuine future expansion items. The current runtime and automated tests are the source of truth.',
    ),
]
for old, new in pairs:
    if readme.count(old) != 1:
        raise SystemExit(f'Unexpected README match count for: {old[:90]}')
    readme = readme.replace(old, new, 1)
readme_path.write_text(readme, encoding='utf-8')

consistency = r'''const assert = require('assert');
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
'''
(ROOT / 'scripts' / 'repository-consistency-test.js').write_text(consistency, encoding='utf-8')

package_path = ROOT / 'package.json'
package = json.loads(package_path.read_text(encoding='utf-8'))
command = 'node scripts/repository-consistency-test.js'
if command not in package['scripts']['test']:
    package['scripts']['test'] += ' && ' + command
package_path.write_text(json.dumps(package, indent=2) + '\n', encoding='utf-8')

phase = '''name: Phase 1 Check

on:
  pull_request:
  push:
    branches:
      - main
      - foreman-demo-implementation

jobs:
  smoke-test:
    name: Smoke and consistency tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Install dependencies
        run: npm install
      - name: Run repository tests
        run: npm test
      - name: Check demo server syntax
        run: node --check apps/demo/server.js
      - name: Validate Docker Compose configuration
        run: docker compose config

  docker-runtime:
    name: Docker build and runtime proof
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t hunter-foreman-final-proof .
      - name: Start and verify container
        shell: bash
        run: |
          set -euo pipefail
          docker run -d --rm --name hunter-foreman-final-proof -p 3010:3000 hunter-foreman-final-proof
          trap 'docker logs hunter-foreman-final-proof || true; docker rm -f hunter-foreman-final-proof 2>/dev/null || true' EXIT
          ready=false
          for attempt in {1..30}; do
            if curl --fail --silent http://127.0.0.1:3010/health > /tmp/hunter-health.json; then ready=true; break; fi
            sleep 1
          done
          test "$ready" = true
          curl --fail --silent http://127.0.0.1:3010/ > /tmp/hunter-home.html
          grep -q 'Hunter Foreman' /tmp/hunter-home.html
          grep -q 'Existing THETECHGUY Events system' /tmp/hunter-home.html
          grep -q 'Existing payment, referral, and commission workflow' /tmp/hunter-home.html
          grep -q "'Dashboard Hub','↗','Planned'" /tmp/hunter-home.html
          grep -q "'Add New App','＋','Planned'" /tmp/hunter-home.html
          grep -q '"ok": true' /tmp/hunter-health.json
'''
(ROOT / '.github' / 'workflows' / 'phase-1-check.yml').write_text(phase, encoding='utf-8')

for temporary in [
    ROOT / 'FINAL_MAIN_PROOF_TRIGGER.txt',
    ROOT / '.github' / 'workflows' / 'one-time-final-main-proof.yml',
    ROOT / 'scripts' / 'finalize-main.py',
]:
    if temporary.exists():
        temporary.unlink()
