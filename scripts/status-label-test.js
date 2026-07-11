const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'apps', 'demo', 'server.js'), 'utf8');

const expected = [
  "['Event Manager','📅','Not connected','Existing THETECHGUY Events system; its private production connection is excluded from this public demo.','disconnected']",
  "['Invitation System','🎟','Not connected','Existing invitation workflow; client-facing data and production services are not connected here.','disconnected']",
  "['QR Access','▦','Not connected','Existing guest-access and QR check-in workflow; excluded from the public runtime.','disconnected']",
  "['WhatsApp Bot','💬','Not connected','Existing private business workflow; credentials, approvals, and client conversations remain outside this release.','disconnected']",
  "['Payment Gateway','💳','Not connected','Existing payment, referral, and commission workflow; transaction services and credentials are excluded from the public demo.','disconnected']",
  "['Dashboard Hub','↗','Planned','Future multi-app routing and operations view.','pending']",
  "['Add New App','＋','Planned','Future extension point for adding additional business applications.','pending']",
];

for (const entry of expected) {
  assert.ok(source.includes(entry), `Missing expected integration state: ${entry}`);
}

const forbidden = [
  "['Event Manager','📅','Planned'",
  "['Invitation System','🎟','Planned'",
  "['QR Access','▦','Planned'",
  "['WhatsApp Bot','💬','Under maintenance'",
  "['Payment Gateway','💳','Under maintenance'",
  "['Add New App','＋','Not connected'",
];

for (const entry of forbidden) {
  assert.ok(!source.includes(entry), `Obsolete integration state remains: ${entry}`);
}

assert.ok(source.includes('.badge.disconnected{color:var(--o)}'), 'Disconnected badge style must exist');
console.log('Hunter Foreman integration status label test passed');
