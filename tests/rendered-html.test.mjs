import assert from "node:assert/strict";
import test from "node:test";

async function worker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

const environment = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};

const context = {
  waitUntil() {},
  passThroughOnException() {},
};

test("renders the Athidhi customer application", async () => {
  const application = await worker();
  const response = await application.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    environment,
    context,
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Athidhi Family Restaurant/i);
  assert.match(html, /Made with heart/i);
  assert.doesNotMatch(html, /codex-preview|Building your site|mock data/i);
});

test("reports database health without exposing database internals", async () => {
  const application = await worker();
  const response = await application.fetch(
    new Request("http://localhost/api/health"),
    environment,
    context,
  );
  const health = await response.json();
  if (response.status === 200) {
    assert.equal(health.ok, true);
    assert.equal(health.database, "connected");
    assert.equal(typeof health.latencyMs, "number");
  } else {
    assert.equal(response.status, 503);
    assert.equal(health.ok, false);
    assert.equal(health.database, "unavailable");
    assert.equal(health.message, "The restaurant database is temporarily unavailable.");
    assert.doesNotMatch(JSON.stringify(health), /PGRST|postgres|relation|schema cache|select /i);
  }
});

test("publishes the versioned restaurant API catalog", async () => {
  const application = await worker();
  const response = await application.fetch(
    new Request("http://localhost/api/v1"),
    environment,
    context,
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.data.name, "Athidhi Restaurant API");
  assert.match(payload.data.documentation, /\/api\/v1\/openapi$/);
  assert.match(payload.data.resources.orders, /\/api\/v1\/orders$/);
  assert.match(payload.data.authentication.guest, /HttpOnly table capability/i);
  assert.doesNotMatch(JSON.stringify(payload), /anonymous Supabase session/i);
});

test("publishes a complete OpenAPI contract", async () => {
  const application = await worker();
  const response = await application.fetch(
    new Request("http://localhost/api/v1/openapi"),
    environment,
    context,
  );
  assert.equal(response.status, 200);
  const document = await response.json();
  assert.equal(document.openapi, "3.1.0");
  assert.ok(document.paths["/menu"]);
  assert.ok(document.paths["/orders/{id}/payments"]);
  assert.ok(document.paths["/analytics"]);
  assert.ok(document.paths["/operations"]);
  assert.ok(document.paths["/security/csrf"]);
  assert.ok(document.components.securitySchemes.tableSessionCookie);
});

test("keeps staff APIs protected", async () => {
  const application = await worker();
  const response = await application.fetch(
    new Request("http://localhost/api/v1/tables"),
    environment,
    context,
  );
  assert.equal(response.status, 401);
  const payload = await response.json();
  assert.equal(payload.error.code, "authentication_required");
});

test("redirects unauthenticated admin requests to the staff login", async () => {
  const application = await worker();
  const response = await application.fetch(
    new Request("http://localhost/admin/dashboard", {
      headers: { accept: "text/html", host: "localhost" },
    }),
    environment,
    context,
  );
  assert.ok([302, 303, 307, 308].includes(response.status));
  const destination = new URL(response.headers.get("location"), "http://localhost");
  assert.equal(destination.pathname, "/admin/login");
  assert.equal(destination.searchParams.get("next"), "/admin/dashboard");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
});

test("issues CSRF tokens and blocks browser mutations without one", async () => {
  const application = await worker();
  const tokenResponse = await application.fetch(
    new Request("http://localhost/api/v1/security/csrf", {
      headers: { host: "localhost" },
    }),
    environment,
    context,
  );
  assert.equal(tokenResponse.status, 200);
  const tokenPayload = await tokenResponse.json();
  assert.equal(typeof tokenPayload.data.token, "string");
  assert.ok(tokenPayload.data.token.length >= 40);
  assert.match(tokenResponse.headers.get("set-cookie") ?? "", /athidhi_csrf=/);
  assert.match(tokenResponse.headers.get("cache-control") ?? "", /no-store/);

  const rejected = await application.fetch(
    new Request("http://localhost/api/v1/auth/session", {
      method: "POST",
      headers: {
        host: "localhost",
        origin: "http://localhost",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "nobody@example.com",
        password: "not-a-real-password",
      }),
    }),
    environment,
    context,
  );
  assert.equal(rejected.status, 403);
  const rejectedPayload = await rejected.json();
  assert.equal(rejectedPayload.error.code, "csrf_rejected");
});
