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

test("reports a connected database through the health endpoint", async () => {
  const application = await worker();
  const response = await application.fetch(
    new Request("http://localhost/api/health"),
    environment,
    context,
  );
  assert.equal(response.status, 200);
  const health = await response.json();
  assert.equal(health.ok, true);
  assert.equal(health.database, "connected");
  assert.equal(typeof health.latencyMs, "number");
});
