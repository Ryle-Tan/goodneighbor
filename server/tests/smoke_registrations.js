/**
 * Smoke test for LIM registration endpoints — plain-English pass/fail.
 *
 * Prerequisites:
 *   1. API running (npm run dev / node src/index.js)
 *   2. Seed data: node db/seed_lim_test.js
 *
 * Run:  node db/smoke_registrations.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool } = require('../src/db');

const base = `http://localhost:${process.env.PORT || 3000}/api`;

const results = [];

async function req(method, path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

/**
 * Print one check in layman terms and record pass/fail.
 * @param {object} opts
 * @param {string} opts.title - short name
 * @param {string} opts.what - what this step is doing
 * @param {string} opts.expected - what should happen
 * @param {{ status: number, json: any }} opts.result - API response
 * @param {(result) => boolean} opts.passIf - return true if the response is correct
 * @param {(result) => string} [opts.got] - optional plain summary of what we got
 */
function check({ title, what, expected, result, passIf, got }) {
  const ok = Boolean(passIf(result));
  results.push({ title, ok });

  console.log(`\n--------------------------------------------------`);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${title}`);
  console.log(`What we did : ${what}`);
  console.log(`Expected    : ${expected}`);
  console.log(`Got status  : ${result.status}`);
  if (got) {
    console.log(`Got detail  : ${got(result)}`);
  } else if (result.json && typeof result.json === 'object' && result.json.error) {
    console.log(`Got detail  : ${result.json.error}`);
  } else if (result.json && typeof result.json === 'object' && result.json.message) {
    console.log(`Got detail  : ${result.json.message}`);
  }
  if (!ok) {
    console.log(`Raw body    : ${JSON.stringify(result.json, null, 2)}`);
  }
}

async function main() {
  console.log('GoodNeighbor — registrations smoke test');
  console.log(`API: ${base}`);
  console.log('Each step below should say PASS if the backend rules are working.\n');

  // --- Logins (setup) ---
  const vLogin = await req('POST', '/auth/login', {
    body: { email: 'volunteer@test.com', password: 'password123' },
  });
  check({
    title: '1. Volunteer can log in',
    what: 'Log in as volunteer@test.com',
    expected: 'HTTP 200 and a token so we can call protected routes',
    result: vLogin,
    passIf: (r) => r.status === 200 && r.json?.token && r.json?.user?.role === 'volunteer',
    got: (r) =>
      r.json?.user
        ? `Logged in as ${r.json.user.name} (${r.json.user.role})`
        : 'No user returned',
  });
  if (!vLogin.json?.token) {
    console.log('\nCannot continue without volunteer login. Did you run seed_lim_test.js?');
    process.exitCode = 1;
    return;
  }
  const vToken = vLogin.json.token;
  const volunteerId = vLogin.json.user.id;

  const oLogin = await req('POST', '/auth/login', {
    body: { email: 'organizer@test.com', password: 'password123' },
  });
  check({
    title: '2. Organizer can log in',
    what: 'Log in as organizer@test.com',
    expected: 'HTTP 200 and role organizer',
    result: oLogin,
    passIf: (r) => r.status === 200 && r.json?.token && r.json?.user?.role === 'organizer',
    got: (r) =>
      r.json?.user
        ? `Logged in as ${r.json.user.name} (${r.json.user.role})`
        : 'No user returned',
  });
  if (!oLogin.json?.token) {
    console.log('\nCannot continue without organizer login.');
    process.exitCode = 1;
    return;
  }
  const oToken = oLogin.json.token;

  // Clean volunteer regs so this script is safe to re-run
  await pool.query('DELETE FROM registrations WHERE user_id = $1', [volunteerId]);

  // --- Join ---
  const join = await req('POST', '/events/1/registrations', {
    token: vToken,
    body: { note: 'I can bring extra gloves!' },
  });
  check({
    title: '3. Volunteer joins an upcoming activity',
    what: 'Volunteer signs up for event #1 (River Cleanup) with a note',
    expected: 'HTTP 201 and status "registered"',
    result: join,
    passIf: (r) => r.status === 201 && r.json?.status === 'registered' && r.json?.id,
    got: (r) =>
      r.json?.id
        ? `Joined "${r.json.event_title}" as registration #${r.json.id}`
        : r.json?.error || 'Join failed',
  });

  const dup = await req('POST', '/events/1/registrations', { token: vToken, body: {} });
  check({
    title: '4. Cannot join the same activity twice',
    what: 'Volunteer tries to join event #1 again',
    expected: 'HTTP 409 — already registered',
    result: dup,
    passIf: (r) => r.status === 409,
    got: (r) => r.json?.error || '(no error message)',
  });

  const orgForbidden = await req('POST', '/events/1/registrations', {
    token: oToken,
    body: {},
  });
  check({
    title: '5. Organizers cannot join as volunteers',
    what: 'Organizer tries to register for an activity',
    expected: 'HTTP 403 — not allowed',
    result: orgForbidden,
    passIf: (r) => r.status === 403,
    got: (r) => r.json?.error || '(no error message)',
  });

  // --- Lists ---
  const mine = await req('GET', '/users/me/registrations', { token: vToken });
  check({
    title: '6. Volunteer can see their own activities',
    what: 'GET /users/me/registrations as the volunteer',
    expected: 'HTTP 200 with at least 1 registration in the list',
    result: mine,
    passIf: (r) => r.status === 200 && Array.isArray(r.json?.data) && r.json.meta?.total >= 1,
    got: (r) =>
      r.json?.meta
        ? `List has ${r.json.meta.total} item(s)`
        : r.json?.error || 'Unexpected response',
  });

  const listOrg = await req('GET', '/events/1/registrations', { token: oToken });
  check({
    title: '7. Organizer can see who joined their event',
    what: 'Organizer lists registrations for event #1',
    expected: 'HTTP 200 with the volunteer in the list',
    result: listOrg,
    passIf: (r) => r.status === 200 && r.json.meta?.total >= 1,
    got: (r) =>
      r.json?.meta
        ? `Organizer sees ${r.json.meta.total} registrant(s)`
        : r.json?.error || 'Unexpected response',
  });

  const listVol = await req('GET', '/events/1/registrations', { token: vToken });
  check({
    title: '8. Volunteer cannot see the full registrant list',
    what: 'Volunteer tries to list everyone on event #1',
    expected: 'HTTP 403 — only organizer/admin may do that',
    result: listVol,
    passIf: (r) => r.status === 403,
    got: (r) => r.json?.error || '(no error message)',
  });

  // --- Cancel & rejoin ---
  const regId = join.json?.id;
  const cancel = await req('DELETE', `/registrations/${regId}`, { token: vToken });
  check({
    title: '9. Volunteer can cancel before the event starts',
    what: `Volunteer cancels registration #${regId}`,
    expected: 'HTTP 200 with a "Registration cancelled" message',
    result: cancel,
    passIf: (r) => r.status === 200 && r.json?.message === 'Registration cancelled',
    got: (r) => r.json?.message || r.json?.error || '(no message)',
  });

  const rejoin = await req('POST', '/events/1/registrations', {
    token: vToken,
    body: { note: 'Back again' },
  });
  check({
    title: '10. Volunteer can join again after cancelling',
    what: 'Volunteer re-registers for event #1',
    expected: 'HTTP 201 with a NEW registration id (old cancelled row kept as history)',
    result: rejoin,
    passIf: (r) =>
      r.status === 201 && r.json?.status === 'registered' && r.json?.id && r.json.id !== regId,
    got: (r) =>
      r.json?.id
        ? `New registration #${r.json.id} (old was #${regId})`
        : r.json?.error || 'Rejoin failed',
  });

  // --- Attendance rules ---
  const earlyAtt = await req('PATCH', `/registrations/${rejoin.json?.id}`, {
    token: oToken,
    body: { status: 'attended' },
  });
  check({
    title: '11. Cannot mark attendance before the event starts',
    what: 'Organizer marks attendance on an event that has not started yet',
    expected: 'HTTP 409 — wait until the event starts',
    result: earlyAtt,
    passIf: (r) => r.status === 409,
    got: (r) => r.json?.error || '(no error message)',
  });

  const ins = await pool.query(
    `INSERT INTO registrations (event_id, user_id, note)
     VALUES (3, $1, 'seeded for attendance')
     RETURNING id`,
    [volunteerId]
  );
  const pastRegId = ins.rows[0].id;

  const att = await req('PATCH', `/registrations/${pastRegId}`, {
    token: oToken,
    body: { status: 'attended' },
  });
  check({
    title: '12. Organizer can mark attended after the event starts',
    what: `Organizer sets registration #${pastRegId} (started event #3) to attended`,
    expected: 'HTTP 200 and status "attended"',
    result: att,
    passIf: (r) => r.status === 200 && r.json?.status === 'attended',
    got: (r) =>
      r.json?.status
        ? `Status is now "${r.json.status}"`
        : r.json?.error || 'Update failed',
  });

  const abs = await req('PATCH', `/registrations/${pastRegId}`, {
    token: oToken,
    body: { status: 'absent' },
  });
  check({
    title: '13. Organizer can fix a mistake (attended → absent)',
    what: `Organizer changes registration #${pastRegId} to absent`,
    expected: 'HTTP 200 and status "absent"',
    result: abs,
    passIf: (r) => r.status === 200 && r.json?.status === 'absent',
    got: (r) =>
      r.json?.status
        ? `Status is now "${r.json.status}"`
        : r.json?.error || 'Update failed',
  });

  const cancelAttended = await req('DELETE', `/registrations/${pastRegId}`, {
    token: vToken,
  });
  check({
    title: '14. Cannot cancel after attendance was recorded',
    what: 'Volunteer tries to cancel a registration already marked attended/absent',
    expected: 'HTTP 409 — attendance already recorded',
    result: cancelAttended,
    passIf: (r) => r.status === 409,
    got: (r) => r.json?.error || '(no error message)',
  });

  const closed = await req('POST', '/events/3/registrations', { token: vToken, body: {} });
  check({
    title: '15. Cannot join an event that already started',
    what: 'Volunteer tries to join event #3 (already started)',
    expected: 'HTTP 409 — event is not open for registration',
    result: closed,
    passIf: (r) => r.status === 409,
    got: (r) => r.json?.error || '(no error message)',
  });

  // --- Summary ---
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log(`\n==================================================`);
  console.log(`SUMMARY: ${passed} passed, ${failed} failed (out of ${results.length})`);
  if (failed === 0) {
    console.log('All registration rules look good.');
  } else {
    console.log('Failed steps:');
    for (const r of results.filter((x) => !x.ok)) {
      console.log(`  - ${r.title}`);
    }
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error('\nSmoke test crashed:', err.message || err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
