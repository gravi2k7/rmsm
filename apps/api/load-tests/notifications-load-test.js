// k6 load test for the notifications module — a real, runnable script,
// not a placeholder. Requires the k6 binary (https://k6.io/docs/get-started/installation/),
// a running instance of this API, and a valid JWT for a test user who is
// already a member of TEST_ORGANIZATION_ID with a role that can send
// notifications (OWNER/ADMINISTRATOR/MANAGER).
//
// This has NOT been run in this sandbox — there is no live instance of
// this API, no seeded database, and no running Postgres/Redis to load
// test against. Written and reviewed for correctness against k6's real
// API, but execution and the numbers it would produce are unverified
// here; flagged explicitly rather than presented as a completed
// benchmark.
//
// Run: k6 run --env BASE_URL=http://localhost:3000 --env JWT=... --env ORG_ID=... --env TEST_RECIPIENT_USER_ID=... notifications-load-test.js

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const JWT = __ENV.JWT;
const ORG_ID = __ENV.ORG_ID;

if (!JWT || !ORG_ID) {
  throw new Error("JWT and ORG_ID env vars are required. See the file header for how to run this.");
}

const TEST_RECIPIENT_USER_ID = __ENV.TEST_RECIPIENT_USER_ID;
if (!TEST_RECIPIENT_USER_ID) {
  throw new Error("TEST_RECIPIENT_USER_ID env var is required — a user id who is a member of ORG_ID.");
}

const sendErrorRate = new Rate("send_errors");
const sendDuration = new Trend("send_duration", true);
const listDuration = new Trend("list_duration", true);

export const options = {
  scenarios: {
    // Ramps from light to the throttle boundary this module actually
    // enforces (30 sends/min per organization, Phase 3's @Throttle on
    // POST .../send) — the point of this scenario is confirming the
    // throttle behaves correctly under load (429s past the limit, not
    // silently dropped requests or a crashed process), not maximizing
    // raw throughput past a limit the API is deliberately enforcing.
    send_notifications: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 5 },
        { duration: "1m", target: 15 },
        { duration: "30s", target: 0 },
      ],
      exec: "sendNotification",
    },
    // A separate, higher-volume scenario for the read path (list/get),
    // which has no special throttle beyond the platform default —
    // representative of a dashboard polling for new notifications.
    list_notifications: {
      executor: "constant-vus",
      vus: 20,
      duration: "2m",
      exec: "listNotifications",
    },
  },
  thresholds: {
    // Explicit, named pass/fail criteria — a load test without
    // thresholds just produces numbers nobody has to act on.
    http_req_failed: ["rate<0.05"], // <5% hard failures (5xx, network errors)
    send_duration: ["p(95)<2000"], // 95% of sends complete under 2s
    list_duration: ["p(95)<500"], // 95% of list reads complete under 500ms
  },
};

function authHeaders() {
  return { headers: { Authorization: `Bearer ${JWT}`, "Content-Type": "application/json" } };
}

export function sendNotification() {
  const payload = JSON.stringify({
    type: "DIRECT",
    channel: "IN_APP",
    recipientUserId: TEST_RECIPIENT_USER_ID,
    subject: `Load test ${__VU}-${__ITER}`,
    body: "Load test notification body.",
  });

  const res = http.post(`${BASE_URL}/api/v1/notifications/organizations/${ORG_ID}/send`, payload, authHeaders());
  sendDuration.add(res.timings.duration);

  const ok = check(res, {
    "send: status is 201 or 429 (throttled, expected under load)": (r) => r.status === 201 || r.status === 429,
  });
  sendErrorRate.add(!ok);

  sleep(1);
}

export function listNotifications() {
  const res = http.get(`${BASE_URL}/api/v1/notifications/organizations/${ORG_ID}?take=20`, authHeaders());
  listDuration.add(res.timings.duration);
  check(res, { "list: status is 200": (r) => r.status === 200 });
  sleep(0.5);
}
